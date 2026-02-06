import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "../Backend/prisma/schema.prisma",
    datasource: {
        url: "postgresql://postgres:1234@localhost:5432/clickseekers",
    },
});
