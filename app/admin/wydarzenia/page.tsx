import AdminWydarzenie from "./AdminWydarzenie"

export default async function DodajWydarzeniePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const params = await searchParams
  return <AdminWydarzenie eventId={params.id} />
}