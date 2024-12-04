import { ApiClient } from "@mondaydotcomorg/api";
export const mondayClient = new ApiClient({
    requestConfig: {
        errorPolicy: 'all'
    },
    token: "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjE3ODQwNDMyMiwidWlkIjozMzgyMTg5MiwiaWFkIjoiMjAyMi0wOC0zMVQxMTo0OTowMC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6OTExNTEwMSwicmduIjoidXNlMSJ9.I4m4CXxhai3k4JumWdc0NO_5EiSjfhE0rxF5_njzJA0",
});
//# sourceMappingURL=mondayClient.js.map