import axios from "axios";

// TODO change url with your RestAPI address. This probably won't change
export default axios.create({
    baseURL: "http://localhost:8093/api/"
})