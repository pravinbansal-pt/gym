"use client"

import { useActionState, useState, useEffect } from "react"
import { changeUsername, type UsernameChangeState } from "../_actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const USERNAME_REGEX = /^[a-zA-Z0-9]+$/

export function UsernameChangeForm({
  currentUsername,
}: {
  currentUsername: string
}) {
  const [state, action, pending] = useActionState<UsernameChangeState, FormData>(
    changeUsername,
    {}
  )
  const [value, setValue] = useState(currentUsername)
  const [clientError, setClientError] = useState("")

  useEffect(() => {
    if (state.success) {
      setClientError("")
    }
  }, [state.success])

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
  const trimmed = value.trim().toLowerCase()
  const isUnchanged = trimmed === currentUsername
  const canSubmit =
    value.length >= 4 &&
    value.length <= 20 &&
    USERNAME_REGEX.test(value) &&
    !clientError &&
    !isUnchanged

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-username">Username</Label>
        <div className="flex gap-2">
          <Input
            id="settings-username"
            name="username"
            value={value}
            onChange={handleChange}
            autoComplete="off"
            maxLength={20}
            className="max-w-xs"
          />
          <Button type="submit" disabled={!canSubmit || pending} size="default">
            {pending ? "Saving..." : "Update"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {state.success && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Username updated!
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Letters and numbers only, 4-20 characters. You can reclaim your own
        previous usernames, but others cannot.
      </p>
    </form>
  )
}
