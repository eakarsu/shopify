import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Briefcase, Clock } from "lucide-react"

const jobs = [
  { title: "Senior Software Engineer", dept: "Engineering", location: "San Francisco, CA", type: "Full-time" },
  { title: "Product Designer", dept: "Design", location: "Remote", type: "Full-time" },
  { title: "Customer Success Manager", dept: "Support", location: "New York, NY", type: "Full-time" },
  { title: "Marketing Specialist", dept: "Marketing", location: "Remote", type: "Full-time" },
]

export default function CareersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We're looking for passionate people to help us build the future of e-commerce. Check out our open positions below.
        </p>
      </div>
      <div className="grid gap-4 max-w-3xl mx-auto">
        {jobs.map((job, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{job.dept}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.type}</span>
                  </div>
                </div>
                <Button>Apply Now</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="text-center mt-12">
        <p className="text-muted-foreground">Don't see a role that fits? Send your resume to careers@shopifyclone.com</p>
      </div>
    </div>
  )
}
