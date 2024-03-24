import axios from "axios";

export default axios.create({
    baseURL: "http://localhost:8093/api/"
})