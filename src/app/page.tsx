import { redirect } from 'next/navigation'

// middleware.ts sends signed-out visitors to /login; signed-in ones land on /home.
export default function Index() {
    redirect('/home')
}
