import { redirect } from "next/navigation";

export default function Home() {
  // Automatically route users to the login screen when they hit the root URL
  redirect("/login");
}