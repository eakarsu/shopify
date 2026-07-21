import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { CustomerDetail } from "@/components/customers/CustomerDetail"

interface CustomerPageProps {
  params: Promise<{ id: string }>
}

async function getCustomer(id: string) {
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: true
        }
      }
    }
  })

  if (!customer) notFound()
  return customer
}

export default async function CustomerPage(props: CustomerPageProps) {
  const params = await props.params;
  const customer = await getCustomer(params.id)

  return <CustomerDetail customer={serialize(customer)} />
}
