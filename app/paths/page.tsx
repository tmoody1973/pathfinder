"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";

export default function PathsDashboard() {
  const { isSignedIn, isLoaded, user } = useUser();
  const paths = useQuery(api.paths.listForCurrentUser, isSignedIn ? {} : "skip");

  if (!isLoaded) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Text as="p" className="text-muted-foreground">
          Loading...
        </Text>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <Text as="h1" className="text-3xl">
          Sign in to see your paths
        </Text>
        <Text as="p" className="text-base text-muted-foreground max-w-md text-center">
          Anonymous paths live in this browser only. Sign in (top right) to save
          them across devices and explore multiple bridges side-by-side.
        </Text>
        <Link href="/" className="underline">
          ← Back to start
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Hi, {user?.firstName ?? "there"}
        </Text>
        <Text as="h1" className="text-4xl md:text-5xl">
          Your paths
        </Text>
        <Text as="p" className="mt-2 text-base text-foreground/70">
          Every bridge you&apos;ve generated, saved permanently to your account.
        </Text>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Text as="p" className="text-sm text-muted-foreground">
            {paths === undefined
              ? "Loading paths..."
              : `${paths.length} path${paths.length === 1 ? "" : "s"}`}
          </Text>
          <Link href="/">
            <Button size="md">+ Generate a new path</Button>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {paths === undefined ? (
            <Text as="p" className="text-muted-foreground">
              Loading...
            </Text>
          ) : paths.length === 0 ? (
            <Card className="block w-full md:col-span-2">
              <Card.Header>
                <Text as="p" className="font-head">
                  No paths yet
                </Text>
                <Text as="p" className="mt-2 text-sm text-foreground/70">
                  Generate your first bridge from the home page. Once you do,
                  it&apos;ll show up here automatically.
                </Text>
              </Card.Header>
            </Card>
          ) : (
            paths.map((p) => (
              <Link key={p._id} href={`/path/${p._id}`} className="block group">
                <Card className="block w-full transition-all group-hover:shadow-none">
                  <Card.Header>
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <Text as="p" className="text-xs uppercase tracking-widest text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()} · {new Date(p.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </Text>
                      <Badge
                        size="sm"
                        variant={
                          p.status === "done"
                            ? "surface"
                            : p.status === "error" || p.status === "timeout"
                              ? "outline"
                              : "default"
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <Text as="h3" className="text-2xl mt-2 leading-tight">
                      {p.currentCareer} → {p.targetCareer}
                    </Text>
                    {p.pathOutline?.title && (
                      <Text as="p" className="mt-1 text-sm text-foreground/70">
                        {p.pathOutline.title}
                      </Text>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.city && (
                        <Badge size="sm" variant="default">
                          📍 {p.city}
                        </Badge>
                      )}
                      {typeof p.hoursPerWeek === "number" && (
                        <Badge size="sm" variant="default">
                          {p.hoursPerWeek}h/wk
                        </Badge>
                      )}
                      {p.profileText && (
                        <Badge size="sm" variant="default">
                          Personalized
                        </Badge>
                      )}
                      {typeof p.currentSalary === "number" && (
                        <Badge size="sm" variant="default">
                          ${Math.round(p.currentSalary / 1000)}K
                        </Badge>
                      )}
                    </div>
                  </Card.Header>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
