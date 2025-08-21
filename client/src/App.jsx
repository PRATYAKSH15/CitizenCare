import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <Button>Click me</Button>
      <p>This is our project called CitizenCare</p>
      <Button className="mt-4" variant="outline">
        Learn More
      </Button>
      <p>This is the demo.</p>
    </div>
  )
}

export default App