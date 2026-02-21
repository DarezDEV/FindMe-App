interface SignInWithPasswordInput {
  email: string
  password: string
}

export async function signInWithPassword(_payload: SignInWithPasswordInput) {
  return Promise.resolve()
}

export async function signOut() {
  return Promise.resolve()
}
