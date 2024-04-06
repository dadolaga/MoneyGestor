import axios from "axios";

// TODO change url with your RestAPI address
export default axios.create({
    baseURL: "http://localhost:8093/api/"
})