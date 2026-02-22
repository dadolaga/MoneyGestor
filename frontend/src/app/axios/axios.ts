import axios from "axios";

// TODO change url with your RestAPI address. This probably won't change
export default axios.create({
    baseURL: "https://localhost:7184/"
})