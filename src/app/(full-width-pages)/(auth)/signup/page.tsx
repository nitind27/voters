import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vote",
  description:
    "Vote",
};

export default function SignUp() {
  return <SignUpForm />;
}
