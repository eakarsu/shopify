export default function ReturnPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Returns & Refunds</h1>
      <div className="prose max-w-none">
        <h2 className="text-2xl font-semibold mt-8 mb-4">30-Day Return Policy</h2>
        <p className="text-muted-foreground mb-4">We want you to be completely satisfied with your purchase. If you're not happy, you can return most items within 30 days of delivery for a full refund.</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Return Conditions</h2>
        <ul className="list-disc pl-6 text-muted-foreground mb-4">
          <li>Items must be unused and in original packaging</li>
          <li>Include all tags, accessories, and documentation</li>
          <li>Proof of purchase is required</li>
          <li>Some items like personalized products are final sale</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">How to Return</h2>
        <ol className="list-decimal pl-6 text-muted-foreground mb-4">
          <li>Log into your account and go to Order History</li>
          <li>Select the item you wish to return</li>
          <li>Print the prepaid return label</li>
          <li>Pack the item securely and drop off at any carrier location</li>
        </ol>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Refund Processing</h2>
        <p className="text-muted-foreground">Refunds are processed within 5-7 business days after we receive your return. You'll receive an email confirmation once processed.</p>
      </div>
    </div>
  )
}
