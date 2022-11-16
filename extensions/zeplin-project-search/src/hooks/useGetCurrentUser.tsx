import { getLocalStorageItem, getPreferenceValues, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import type { User } from "../types";
import fetch from "node-fetch";

const CURRENT_ZEPLIN_USER_KEY = "CURRENT_ZEPLIN_USER";

async function fetchCurrentUserFromLocalStorage(): Promise<User | undefined> {
  const item = await getLocalStorageItem<string>(CURRENT_ZEPLIN_USER_KEY);
  if (item) {
    const user = JSON.parse(item) as User;
    return user;
  }
}

async function saveCurrentUser(currentUser: User) {
  const data = JSON.stringify(currentUser);
  await setLocalStorageItem(CURRENT_ZEPLIN_USER_KEY, data);
}

async function fetchCurrentUserFromAPI(): Promise<User | undefined> {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();

  try {
    const response = await fetch(`https://api.zeplin.dev/v1/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERSONAL_ACCESS_TOKEN}`,
      },
    });

    return (await response.json()) as User;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not get current user");
  }
}

export function useGetCurrentUser() {
  const [currentUser, setCurrentUser] = useState<User>();

  useEffect(() => {
    fetchCurrentUserFromLocalStorage().then((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });

    // A user (token) might be changed so refetch it async even if exists in local storage
    fetchCurrentUserFromAPI().then((user) => {
      if (user) {
        saveCurrentUser(user);
        setCurrentUser(user);
      }
    });
  }, []);

  return { currentUser };
}
