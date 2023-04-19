import { AuthContext } from "@/contexts/AuthContext";
import { setupAPIClient } from "@/services/api";
import { api } from "@/services/apiClient";
import { withSSRAuth } from "@/utils/withSSRAuth";
import { useContext, useEffect } from "react";

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    api
      .get("/me")
      .then((response) => console.log(response))
      .catch((err) => console.log(err));
  }, []);

  return <h1>dashboard: {user?.email}</h1>;
}

// redireciona o cliente que ainda não está logado para a tela de login, não consegue acessar essa página aqui sem estar logado
// poderia ser feito esse redirecionado com useEffect, mas aconteceria pelo lado do client, se o user desabilita o javascript ele consiguiria ver o que tem em tela(parte da interface sem funcionamento)
export const getServerSideProps = withSSRAuth(async (ctx) => {
  const apiClient = setupAPIClient(ctx);

  const response = await apiClient.get("/me");

  console.log(response.data);

  return {
    props: {},
  };
});
