"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "./actions";

function SubmitButton() { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="w-full rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>; }
export function LoginForm() { const [state, action] = useActionState(login, { error: null }); return <form action={action} className="mt-6 space-y-4"><div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label><input id="email" name="email" type="email" autoComplete="email" required className="w-full rounded-md border border-[var(--line)] px-3 py-2" /></div><div><label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="w-full rounded-md border border-[var(--line)] px-3 py-2" /></div>{state.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}<SubmitButton /></form>; }
