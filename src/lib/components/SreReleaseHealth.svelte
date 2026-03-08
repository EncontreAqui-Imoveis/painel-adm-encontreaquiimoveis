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

    // Focus only on backend releases as requested
    $: backendReleases = releases["github:backend"] || [];

    const infrastructureLinks = [
        {
            name: "Github",
            url: "https://github.com/orgs/EncontreAqui-Imoveis/repositories",
            icon: `<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>`,
            color: "hover:bg-[#2d333b]",
        },
        {
            name: "Vercel",
            url: "https://vercel.com/ctrshift-pms-projects/painel-adm-maisimoveis",
            icon: `<path d="M256 32L20 464h472L256 32z" />`,
            color: "hover:bg-[#000]",
        },
        {
            name: "Railway",
            url: "https://railway.com/project/a0eb31dd-b653-417e-aa3b-9bb8cbc15e72?environmentId=ee9968a2-ae79-4688-9cad-8c78a5671482",
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />`,
            color: "hover:bg-[#0b0c0f]",
        },
        {
            name: "TiDB",
            url: "https://tidbcloud.com/project/clusters?orgId=1372813089209279616&projectId=1372813089454597479",
            icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />`,
            color: "hover:bg-[#23292e]",
        },
    ];

    const statusConfig = {
        success: {
            color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
            label: "SUCESSO",
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />',
        },
        stable: {
            color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            label: "ESTÁVEL",
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />',
        },
        rollback: {
            color: "bg-red-500/10 text-red-500 border-red-500/20",
            label: "ROLLBACK",
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />',
        },
    };
</script>

<div
    class="bg-[#0b0f1a] rounded-3xl border border-gray-800 shadow-2xl flex flex-col h-full overflow-hidden"
>
    <!-- Header: Links de Infraestrutura -->
    <div class="px-8 py-6 border-b border-gray-800/50">
        <div
            class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
        >
            <div>
                <h3
                    class="font-black text-white text-lg flex items-center gap-3"
                >
                    <svg
                        class="w-6 h-6 text-indigo-500"
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
                    Infra & Lançamentos
                </h3>
                <p
                    class="text-[11px] text-gray-500 mt-1 font-bold tracking-wide uppercase opacity-60"
                >
                    Acesso rápido ao Github, Vercel, Railway e TiDB
                </p>
            </div>

            <div class="flex flex-wrap gap-2">
                {#each infrastructureLinks as link}
                    <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-gray-800 bg-[#111827] text-gray-400 hover:text-white transition-all duration-300 font-black text-[10px] uppercase tracking-wider {link.color} hover:border-gray-600 hover:shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                        title="Ver no {link.name}"
                    >
                        <svg
                            class="w-4 h-4"
                            fill={link.name === "Vercel" ||
                            link.name === "Github"
                                ? "currentColor"
                                : "none"}
                            stroke={link.name === "Railway" ||
                            link.name === "TiDB"
                                ? "currentColor"
                                : "none"}
                            viewBox="0 0 24 24"
                        >
                            {@html link.icon}
                        </svg>
                        {link.name}
                        <svg
                            class="w-2.5 h-2.5 opacity-40 ml-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="3"
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                        </svg>
                    </a>
                {/each}
            </div>
        </div>
    </div>

    <!-- Timeline Body: Backend Releases Only -->
    <div class="p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div class="flex items-center gap-3 mb-8">
            <svg
                class="w-4 h-4 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 12h14M5 12l4-4m-4 4l4 4"
                />
            </svg>
            <span
                class="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]"
                >Deploys Recentes (Backend)</span
            >
        </div>

        <div class="relative ml-2">
            <!-- Central Line -->
            <div
                class="absolute left-[7px] top-2 bottom-2 w-[1.5px] bg-gray-800/80"
            ></div>

            <div class="space-y-12">
                {#each backendReleases as release}
                    <div class="relative pl-10 group/item">
                        <!-- Timeline Dot -->
                        <div
                            class="absolute left-0 top-[6px] w-[15px] h-[15px] rounded-full border-[3px] bg-[#0b0f1a] transition-all duration-300 group-hover/item:scale-125 {release.status ===
                            'rollback'
                                ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                : 'border-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.3)]'}"
                        ></div>

                        <div
                            class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4"
                        >
                            <div class="flex-1">
                                <div class="flex items-center gap-4">
                                    <a
                                        href="https://github.com/EncontreAqui-Imoveis/servidor-encontreaqui-imoveis/commit/{release.version}"
                                        target="_blank"
                                        class="text-xl font-black tracking-tighter text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                                    >
                                        <span class="text-indigo-500 opacity-50"
                                            >#</span
                                        >{release.version}
                                    </a>
                                    <span
                                        class="flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[9px] font-black tracking-widest {statusConfig[
                                            release.status
                                        ].color}"
                                    >
                                        <svg
                                            class="w-3.5 h-3.5"
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
                                    class="mt-3 text-xs text-gray-500 font-bold leading-relaxed"
                                >
                                    <span
                                        class="text-gray-600 mr-2 opacity-50 uppercase tracking-tighter"
                                        >Impacto:</span
                                    >
                                    <span class="text-gray-300 italic"
                                        >"{release.impact}"</span
                                    >
                                </div>
                            </div>
                            <div
                                class="text-right flex flex-col items-end gap-1"
                            >
                                <span
                                    class="text-[10px] font-black text-gray-600 uppercase tracking-widest block"
                                    >Hoje &bull; {release.time}</span
                                >
                                <div
                                    class="w-12 h-0.5 bg-gray-800 group-hover/item:w-16 transition-all duration-300"
                                ></div>
                            </div>
                        </div>
                    </div>
                {/each}

                {#if backendReleases.length === 0}
                    <div
                        class="flex flex-col items-center justify-center py-16 opacity-20"
                    >
                        <svg
                            class="w-16 h-16 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1"
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5"
                            />
                        </svg>
                        <span
                            class="text-sm font-black italic tracking-widest uppercase"
                            >Sem Deploys Registrados</span
                        >
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #1f2937;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #374151;
    }
</style>
