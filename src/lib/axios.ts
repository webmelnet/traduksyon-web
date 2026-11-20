import Axios, { AxiosError } from 'axios'

// Laravel Sanctum SPA (cookie) auth — same setup as winv-web/src/lib/axios.js.
const axios = Axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    },
    withCredentials: true,
    withXSRFToken: true,
})

export const csrf = () => axios.get('/sanctum/csrf-cookie')

export { AxiosError }
export default axios
