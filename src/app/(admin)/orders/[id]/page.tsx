import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { serialize } from "@/lib/utils"
import { OrderDetail } from "@/components/orders/OrderDetail"

interface OrderPageProps {
  params: Promise<{ id: string }>
}

async function getOrder(id: string) {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              images: true
            }
          },
          variant: true
        }
      },
      timeline: {
        orderBy: { createdAt: "desc" }
      }
    }
  })

  if (!order) notFound()
  return order
}

export default async function OrderPage(props: OrderPageProps) {
  const params = await props.params;
  const order = await getOrder(params.id)

  return <OrderDetail order={serialize(order)} />
}
