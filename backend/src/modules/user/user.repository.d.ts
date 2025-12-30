import type { Prisma } from '@prisma/client';
export declare const findUserById: (id: string) => Prisma.Prisma__UserClient<{
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    updatedAt: Date;
    activeWorkoutId: string | null;
} | null, null, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const findUserByEmail: (email: string) => Prisma.Prisma__UserClient<{
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    updatedAt: Date;
    activeWorkoutId: string | null;
} | null, null, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const createUser: (data: Prisma.UserCreateInput) => Prisma.Prisma__UserClient<{
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    updatedAt: Date;
    activeWorkoutId: string | null;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const updateUser: (id: string, data: Prisma.UserUpdateInput) => Prisma.Prisma__UserClient<{
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    updatedAt: Date;
    activeWorkoutId: string | null;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
export declare const deleteUser: (id: string) => Prisma.Prisma__UserClient<{
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    updatedAt: Date;
    activeWorkoutId: string | null;
}, never, import("@prisma/client/runtime/client").DefaultArgs, {
    adapter: import("@prisma/adapter-pg").PrismaPg;
    log: ("query" | "warn" | "error")[];
}>;
//# sourceMappingURL=user.repository.d.ts.map