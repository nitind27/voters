import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vote",
  description:
    "Vote",
};

export default function SignIn() {
  return <SignInForm />;
}
