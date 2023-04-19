import { signOut } from "@/contexts/AuthContext";
import axios, { AxiosError } from "axios";
import { GetServerSidePropsContext } from "next";
import { parseCookies, setCookie } from "nookies";
import { AuthTokenError } from "./errors/AuthTokenError";

let isRefreshing = false;
let failedRequestsQueue = Array<FailedRequestsQueue>();

type FailedRequestsQueue = {
  onSuccess: (token: string) => void;
  onFailure: (err: AxiosError) => void;
};

interface AxiosErrorReponse {
  code?: string;
}

// api pra quando for chamar do lado do server
export function setupAPIClient(ctx: GetServerSidePropsContext | undefined = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      Authorization: `Bearer ${cookies["nextauth.token"]}`,
    },
  });

  // interceptors tem a opção de interceptar requisições ou respostas, se for req o código vai ser executado antes de alguma req ser feita pro back e se for res, depois que receber do back
  // use() recebe duas funções como parametro: o que fazer se a response der sucesso e o que fazer se a response der erro
  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError<AxiosErrorReponse>) => {
      if (error.response?.status === 401) {
        if (error.response.data?.code === "token.expired") {
          // o erro 401 pode vir sem a mensgaem
          // renovar o token
          cookies = parseCookies(ctx);

          const { "nextauth.refreshToken": refreshToken } = cookies;
          const originalConfig = error.config; // config é toda a configuração da req feita pro back

          if (!isRefreshing) {
            isRefreshing = true;

            api
              .post("/refresh", {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data;

                setCookie(ctx, "nextauth.token", token, {
                  maxAge: 60 * 60 * 24 * 30, // 30d
                  path: "/",
                });

                setCookie(ctx, "nextauth.refreshToken", response.data.refreshToken, {
                  maxAge: 60 * 60 * 24 * 30, // 30d
                  path: "/",
                });

                api.defaults.headers["Authorization"] = `Bearer ${token}`;

                failedRequestsQueue.forEach((request) => request.onSuccess(token));
                failedRequestsQueue = [];
              })
              .catch((err) => {
                failedRequestsQueue.forEach((request) => request.onFailure(err));
                failedRequestsQueue = [];

                if (typeof window !== "undefined") {
                  // executar o signOut só se estiver do lado do client, porque o méotodo Router.push (authContext) só funciona do lado do browser
                  signOut();
                }
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          // o axios não suporta interceptions com async await, única forma do código ser assincrono é retornando de dentro do interception uma promise
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({
              onSuccess: (token: string) => {
                if (!originalConfig?.headers) {
                  return;
                }

                originalConfig.headers["Authorization"] = `Bearer ${token}`;

                resolve(api(originalConfig));
              },
              onFailure: (err: AxiosError) => {
                reject(err);
              },
            });
          });
        } else {
          // se o error for 401, mas não for dese tipo deslogar o user (pq foi erro de autenticação)
          if (typeof window !== "undefined") {
            signOut();
          } else {
            return Promise.reject(new AuthTokenError());
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
}
