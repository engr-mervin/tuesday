import mondaySdk from "monday-sdk-js";
const mondayClient = mondaySdk();
mondayClient.setApiVersion('2023-10');
mondayClient.setToken("eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjE3ODQwNDMyMiwidWlkIjozMzgyMTg5MiwiaWFkIjoiMjAyMi0wOC0zMVQxMTo0OTowMC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6OTExNTEwMSwicmduIjoidXNlMSJ9.I4m4CXxhai3k4JumWdc0NO_5EiSjfhE0rxF5_njzJA0");
export { mondayClient };
//# sourceMappingURL=mondayClient.js.map