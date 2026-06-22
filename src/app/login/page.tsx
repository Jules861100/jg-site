import fs from "node:fs";
import path from "node:path";
import { Suspense } from "react";
import "../_design/login.css";
import LoginClient from "../_design/LoginClient";

export default function LoginPage() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "src/app/_design/login.body.html"),
    "utf8"
  );

  return (
    <Suspense>
      <LoginClient html={html} />
    </Suspense>
  );
}
