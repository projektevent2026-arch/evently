import AdminWydarzenie from "./AdminWydarzenie"

export default async function DodajWydarzeniePage({
  searchParams,
}: {
  searchParams: { id?: string }
}) {
  return <AdminWydarzenie eventId={searchParams.id} />
}