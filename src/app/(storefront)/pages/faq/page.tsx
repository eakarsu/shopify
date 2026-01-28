import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  { q: "What payment methods do you accept?", a: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, and Google Pay." },
  { q: "How long does shipping take?", a: "Standard shipping takes 5-7 business days. Express shipping is available for 2-3 business days delivery." },
  { q: "What is your return policy?", a: "We offer a 30-day return policy for all unused items in original packaging. See our Returns page for details." },
  { q: "Do you ship internationally?", a: "Yes! We ship to over 50 countries. International shipping typically takes 7-14 business days." },
  { q: "How can I track my order?", a: "Once your order ships, you'll receive a tracking number via email to monitor your delivery." },
  { q: "Are your products authentic?", a: "Absolutely! We only sell 100% authentic products sourced directly from manufacturers or authorized distributors." }
]

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">Find answers to common questions about our products and services.</p>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
            <AccordionContent>{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
