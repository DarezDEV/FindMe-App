export async function selectRows<T>() {
  return Promise.resolve([] as T[])
}

export async function upsertRow<T>() {
  return Promise.resolve(undefined as T | undefined)
}

export async function deleteRow() {
  return Promise.resolve()
}
