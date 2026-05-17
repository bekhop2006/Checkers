"use client";

import { useT } from "@/shared/i18n/context/locale-context";

interface UsernameFieldProps {
  name?: string;
  defaultValue?: string;
  required?: boolean;
}

/** Nickname input with @ hint and validation hints. */
export function UsernameField({
  name = "username",
  defaultValue = "",
  required = true,
}: UsernameFieldProps) {
  const t = useT();

  return (
    <div>
      <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
        {t("profile.username")}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-medium">
          @
        </span>
        <input
          type="text"
          name={name}
          defaultValue={defaultValue}
          required={required}
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          autoComplete="username"
          placeholder="blitz_master"
          className="input-field pl-9"
        />
      </div>
      <p className="text-xs text-stone-500 mt-1.5">{t("profile.usernameHint")}</p>
    </div>
  );
}
