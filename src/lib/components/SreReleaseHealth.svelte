<script lang="ts">
    export let releases: Record<
        string,
        {
            version: string;
            date: string;
            time: string;
            status: "success" | "rollback" | "stable";
            impact: string;
        }[]
    > = {};

    let activePlatform: "github" | "vercel" = "github";
    let activeRepo = "backend";

    // Receptores de repositórios baseados na plataforma
    const platformRepos: Record<string, string[]> = {
        github: ["backend", "frontend", "site-im"],
        vercel: ["frontend", "site-im"],
    };

    $: currentRepoReleases = releases[`${activePlatform}:${activeRepo}`] || [];

    const statusConfig = {
        success: {
            color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
            label: "RECENTE",
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />',
        },
        stable: {
            color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
            label: "ESTÁVEL",
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />',
        },
        rollback: {
            color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
            label: "ROLLBACK",
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />',
        },
    };

    function setPlatform(platform: "github" | "vercel") {
        activePlatform = platform;
        activeRepo = platformRepos[platform][0];
    }
</script>

<div
    class="bg-[#1a1f2e] rounded-2xl border border-gray-700/50 shadow-2xl flex flex-col h-full overflow-hidden"
>
    <!-- Header with Platform Selectors -->
    <div
        class="px-6 py-5 border-b border-gray-700/50 flex justify-between items-center"
    >
        <div>
            <h3 class="font-black text-gray-100 flex items-center gap-2">
                <svg
                    class="w-5 h-5 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                </svg>
                Saúde de Lançamentos
            </h3>
            <p class="text-[11px] text-gray-400 mt-1 font-medium italic">
                Histórico de deploys e impacto na estabilidade
            </p>
        </div>

        <div class="flex gap-3">
            <button
                class={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 font-bold text-xs ${activePlatform === "github" ? "bg-[#2d333b] border-[#444c56] text-white shadow-lg" : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-500"}`}
                on:click={() => setPlatform("github")}
            >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
                    ><path
                        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                    /></svg
                >
                Github
            </button>
            <button
                class={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 font-bold text-xs ${activePlatform === "vercel" ? "bg-[#7c3aed] border-[#9061f9] text-white shadow-lg" : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-500"}`}
                on:click={() => setPlatform("vercel")}
            >
                <svg class="w-3 h-3 fill-current" viewBox="0 0 512 512"
                    ><path d="M256 32L20 464h472L256 32z" /></svg
                >
                Vercel
            </button>
        </div>
    </div>

    <!-- Repository Chips -->
    <div
        class="px-6 py-4 flex gap-2 border-b border-gray-700/30 overflow-x-auto scroller-hidden"
    >
        {#each platformRepos[activePlatform] as repo}
            <button
                class={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeRepo === repo ? "bg-[#4f46e5] border-[#6366f1] text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}
                on:click={() => (activeRepo = repo)}
            >
                <svg
                    class="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                </svg>
                {repo}
            </button>
        {/each}
    </div>

    <!-- Timeline Body -->
    <div class="p-6 flex-1 overflow-y-auto">
        <div class="relative ml-2">
            <!-- Central Line -->
            <div
                class="absolute left-[7px] top-2 bottom-2 w-[1.5px] bg-gray-700/50"
            ></div>

            <div class="space-y-10">
                {#each currentRepoReleases as release}
                    <div class="relative pl-8">
                        <!-- Timeline Dot -->
                        <div
                            class={`absolute left-0 top-[6px] w-[15px] h-[15px] rounded-full border-[3px] bg-[#1a1f2e] transition-colors duration-500 ${release.status === "rollback" ? "border-red-500" : "border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"}`}
                        ></div>

                        <div
                            class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3"
                        >
                            <div>
                                <div class="flex items-center gap-3">
                                    <span
                                        class="text-lg font-black tracking-tight text-gray-100"
                                        >v{release.version}</span
                                    >
                                    <span
                                        class={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[9px] font-black tracking-widest ${statusConfig[release.status].color}`}
                                    >
                                        <svg
                                            class="w-3 h-3"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            {@html statusConfig[release.status]
                                                .icon}
                                        </svg>
                                        {statusConfig[release.status].label}
                                    </span>
                                </div>
                                <div
                                    class="mt-2 text-[11px] text-gray-400 font-medium"
                                >
                                    Impacto: <span
                                        class="text-gray-200 font-bold"
                                        >{release.impact}</span
                                    >
                                </div>
                            </div>
                            <div class="text-right">
                                <span
                                    class="text-[11px] font-bold text-gray-500 uppercase tracking-widest block"
                                    >Hoje &bull; {release.time}</span
                                >
                            </div>
                        </div>
                    </div>
                {/each}

                {#if currentRepoReleases.length === 0}
                    <div
                        class="flex flex-col items-center justify-center py-10 opacity-30"
                    >
                        <svg
                            class="w-12 h-12 mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5"
                            />
                        </svg>
                        <span class="text-xs font-bold italic"
                            >Nenhum deploy encontrado</span
                        >
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .scroller-hidden::-webkit-scrollbar {
        display: none;
    }
    .scroller-hidden {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
