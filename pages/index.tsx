import { FormEvent, useContext, useState } from "react";
import styles from "../styles/Home.module.css";
import { AuthContext } from "@/contexts/AuthContext";
import { GetServerSideProps } from "next";
import { parseCookies } from "nookies";
import { withSSRGuest } from "@/utils/withSSRGuest";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signIn } = useContext(AuthContext);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const data = {
      email,
      password,
    };

    await signIn(data);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <button type="submit">Entrar</button>
    </form>
  );
}

// com cookies é fácil fazer a transição entre server e client dentro do next, porque os cookies podem ser acessados entre os dois. se cookie for http only, ele é apenas acessível pelo lado server

// se o user está logado, ele não consegue entrar novamente na página de login, é redirecionado para a página inicial logada
export const getServerSideProps = withSSRGuest(async (ctx) => {
  return {
    props: {},
  };
});
