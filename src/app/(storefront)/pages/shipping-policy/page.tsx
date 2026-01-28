export default function ShippingPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Shipping Policy</h1>
      <div className="prose max-w-none">
        <h2 className="text-2xl font-semibold mt-8 mb-4">Domestic Shipping</h2>
        <p className="text-muted-foreground mb-4">Standard Shipping (5-7 business days): $5.99 or FREE on orders over $50</p>
        <p className="text-muted-foreground mb-4">Express Shipping (2-3 business days): $12.99</p>
        <p className="text-muted-foreground mb-4">Next Day Shipping (1 business day): $24.99</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">International Shipping</h2>
        <p className="text-muted-foreground mb-4">We ship to over 50 countries worldwide. International shipping rates and delivery times vary by destination.</p>
        <p className="text-muted-foreground mb-4">Standard International (7-14 business days): Starting at $14.99</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Order Processing</h2>
        <p className="text-muted-foreground mb-4">Orders placed before 2 PM EST are processed the same business day. Orders placed after 2 PM EST or on weekends will be processed the next business day.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Tracking Your Order</h2>
        <p className="text-muted-foreground">Once your order ships, you will receive a confirmation email with tracking information.</p>
      </div>
    </div>
  )
}
