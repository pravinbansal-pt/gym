"use client"

import { useActionState, useState } from "react"
import { setUsername, type UsernameFormState } from "../_actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const USERNAME_REGEX = /^[a-zA-Z0-9]+$/

export function UsernameForm() {
  const [state, action, pending] = useActionState<UsernameFormState, FormData>(
    setUsername,
    {}
  )
  const [value, setValue] = useState("")
  const [clientError, setClientError] = useState("")

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)

    if (v.length === 0) {
      setClientError("")
    } else if (v.length < 4) {
      setClientError("Must be at least 4 characters")
    } else if (v.length > 20) {
      setClientError("Must be 20 characters or fewer")
    } else if (!USERNAME_REGEX.test(v)) {
      setClientError("Only letters and numbers allowed")
    } else {
      setClientError("")
    }
  }

  const error = state.error || clientError
  const canSubmit =
    value.length >= 4 &&
    value.length <= 20 &&
    USERNAME_REGEX.test(value) &&
    !clientError

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Choose a Username</CardTitle>
          <CardDescription>
            Pick a unique username. Letters and numbers only, at least 4
            characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="e.g. johndoe42"
                value={value}
                onChange={handleChange}
                autoFocus
                autoComplete="off"
                maxLength={20}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit" disabled={!canSubmit || pending} size="lg">
              {pending ? "Saving..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
