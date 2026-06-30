export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type RequireCurrentUserResult =
  | {
      status: "authenticated";
      user: CurrentUser;
    }
  | {
      status: "unauthenticated";
    };
