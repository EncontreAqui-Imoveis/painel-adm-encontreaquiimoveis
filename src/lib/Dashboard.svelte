<script lang="ts">
    import Sidebar from "./Sidebar.svelte";
    import Header from "./Header.svelte";
    import Table from "./Table.svelte";
    import Modal from "./Modal.svelte";
    import Pagination from "./Pagination.svelte";
    import FilterControls from "./FilterControls.svelte";
    import KpiCard from "./KpiCard.svelte";
    import VerificationTable from "./VerificationTable.svelte";
    import SreSignalCard from "./components/SreSignalCard.svelte";
    import SreTimeSeriesChart from "./components/charts/SreTimeSeriesChart.svelte";
    import SreActionableAlerts from "./components/SreActionableAlerts.svelte";
    import SreAvailability from "./components/SreAvailability.svelte";
    import SreReleaseHealth from "./components/SreReleaseHealth.svelte";
    import SreExternalServices from "./components/SreExternalServices.svelte";
    import { requestAdminSreStats } from "./adminSessionService";
    import { fetchPlatformResponse } from "./adminFetchService";
    import { clearSessionToken, hasSessionToken } from "./sessionState";
    import { onMount, onDestroy } from "svelte";
    import type {
        Property,
        Broker,
        User,
        View,
        DataItem,
        ViewConfig,
    } from "./types";

    export let initialView: View = "dashboard";

    let activeView: View = "dashboard";
    let hasAppliedInitialView = false;
    let allData: DataItem[] = [];
    let headers: string[] = [];
    let isLoading: boolean = true;
    let showModal = false;
    let itemToDelete: { id: number; type: string } | null = null;
    let isSidebarOpen = false;

    let searchTerm = "";
    let searchColumn = "all";
    let itemsPerPage = 10;
    let currentPage = 1;
    let totalItems = 0;
    let statusFilter = "";

    let editingId: number | null = null;
    let editableItemData: Partial<DataItem> = {};

    // Estados para feedback visual
    let isSaving = false;
    let saveMessage = "";
    let saveMessageType: "success" | "error" = "success";

    let sortBy = "id";
    let sortOrder = "desc";

    type PendingCounts = {
        propertyRequests: number;
        brokerRequests: number;
    };
    let pendingCounts: PendingCounts = {
        propertyRequests: 0,
        brokerRequests: 0,
    };
    let pendingCountsInterval: ReturnType<typeof setInterval> | null = null;

    interface Stats {
        totalProperties: number;
        totalBrokers: number;
        totalUsers: number;
    }
    let stats: Stats | null = null;
    let sreStats: any = null;
    let timeLabels = Array.from(
        { length: 12 },
        (_, i) => `${i * 2}h atrás`,
    ).reverse();

    $: totalClients = stats
        ? Math.max(0, stats.totalUsers - stats.totalBrokers)
        : 0;

    interface DashboardChartData {
        propertiesByStatus: { status: string; count: number }[];
        newPropertiesOverTime: { date: string; count: number }[];
    }
    let chartData: DashboardChartData | null = null;
    let isChartLoading = false;
    let chartError: string | null = null;
    type LazySvelteComponent = any;

    let PropertyManagementComponent: LazySvelteComponent | null = null;
    let ClientManagementComponent: LazySvelteComponent | null = null;
    let BrokerManagementComponent: LazySvelteComponent | null = null;
    let CreatePropertyComponent: LazySvelteComponent | null = null;
    let CreateUserComponent: LazySvelteComponent | null = null;
    let PropertyArchiveComponent: LazySvelteComponent | null = null;
    let NegotiationRequestsComponent: LazySvelteComponent | null = null;
    let NegotiationProgressComponent: LazySvelteComponent | null = null;
    let ContractsModuleComponent: LazySvelteComponent | null = null;
    let CommissionsModuleComponent: LazySvelteComponent | null = null;
    let SendNotificationComponent: LazySvelteComponent | null = null;
    let AdminNotificationsPanelComponent: LazySvelteComponent | null = null;
    let StatusPieChartComponent: LazySvelteComponent | null = null;
    let NewPropertiesLineChartComponent: LazySvelteComponent | null = null;

    async function ensureDashboardCharts() {
        if (!StatusPieChartComponent) {
            const module = await import(
                "./components/charts/StatusPieChart.svelte"
            );
            StatusPieChartComponent = module.default;
        }
        if (!NewPropertiesLineChartComponent) {
            const module = await import(
                "./components/charts/NewPropertiesLineChart.svelte"
            );
            NewPropertiesLineChartComponent = module.default;
        }
    }

    async function ensureViewComponents(view: View) {
        if (view === "properties" || view === "property_requests") {
            if (!PropertyManagementComponent) {
                const module = await import("./PropertyManagement.svelte");
                PropertyManagementComponent = module.default;
            }
            return;
        }
        if (view === "sold_properties") {
            if (!PropertyArchiveComponent) {
                const module = await import(
                    "./components/PropertyArchive.svelte"
                );
                PropertyArchiveComponent = module.default;
            }
            return;
        }
        if (view === "create_property") {
            if (!CreatePropertyComponent) {
                const module = await import(
                    "./components/CreateProperty.svelte"
                );
                CreatePropertyComponent = module.default;
            }
            return;
        }
        if (view === "create_user") {
            if (!CreateUserComponent) {
                const module = await import("./components/CreateUser.svelte");
                CreateUserComponent = module.default;
            }
            return;
        }
        if (view === "negotiation_requests") {
            if (!NegotiationRequestsComponent) {
                const module = await import(
                    "./components/NegotiationRequests.svelte"
                );
                NegotiationRequestsComponent = module.default;
            }
            return;
        }
        if (view === "negotiation_progress") {
            if (!NegotiationProgressComponent) {
                const module = await import(
                    "./components/NegotiationProgress.svelte"
                );
                NegotiationProgressComponent = module.default;
            }
            return;
        }
        if (view === "negotiation_contracts") {
            if (!ContractsModuleComponent) {
                const module = await import(
                    "./components/ContractsModule.svelte"
                );
                ContractsModuleComponent = module.default;
            }
            return;
        }
        if (view === "commissions") {
            if (!CommissionsModuleComponent) {
                const module = await import(
                    "./components/CommissionsModule.svelte"
                );
                CommissionsModuleComponent = module.default;
            }
            return;
        }
        if (view === "brokers") {
            if (!BrokerManagementComponent) {
                const module = await import("./BrokerManagement.svelte");
                BrokerManagementComponent = module.default;
            }
            return;
        }
        if (view === "clients") {
            if (!ClientManagementComponent) {
                const module = await import(
                    "./components/ClientManagement.svelte"
                );
                ClientManagementComponent = module.default;
            }
            return;
        }
        if (view === "notifications") {
            if (!SendNotificationComponent) {
                const module = await import(
                    "./components/SendNotification.svelte"
                );
                SendNotificationComponent = module.default;
            }
            if (!AdminNotificationsPanelComponent) {
                const module = await import(
                    "./components/AdminNotificationsPanel.svelte"
                );
                AdminNotificationsPanelComponent = module.default;
            }
            return;
        }
        if (view === "dashboard") {
            await ensureDashboardCharts();
        }
    }

    // Estado para dados de verificacao
    let pendingBrokers: Broker[] = [];

    const viewConfig: Record<View, ViewConfig> = {
        dashboard: {
            title: "Dashboard",
        },
        properties: {
            endpoint: "/admin/properties-with-brokers",
            title: "Gerenciamento de Imóveis",
            headers: [
                "ID",
                "Codigo",
                "Titulo",
                "Tipo",
                "Status",
                "Preco",
                "Cidade",
                "Anunciante",
            ],
            filterOptions: [
                { value: "p.id", label: "ID" },
                { value: "p.code", label: "Codigo" },
                { value: "p.title", label: "Titulo" },
            ],
            sortColumn: "p.title",
        },
        property_requests: {
            title: "Solicitações de Imóveis",
        },
        sold_properties: {
            title: "Imóveis Vendidos/Alugados",
        },
        negotiation_requests: {
            title: "Solicitação de Propostas",
        },
        negotiation_progress: {
            title: "Imóveis em Negociação",
        },
        negotiation_contracts: {
            title: "Contratos",
        },
        commissions: {
            title: "Comissões (VGV)",
        },
        create_property: {
            title: "Cadastrar Imóvel",
        },
        create_user: {
            title: "Cadastrar Usuário",
        },
        brokers: {
            endpoint: "/admin/brokers",
            title: "Gerenciamento de Corretores",
            headers: [
                "ID",
                "Nome",
                "Email",
                "CRECI",
                "Criado em",
                "Total de Imoveis",
            ],
            filterOptions: [
                { value: "name", label: "Nome" },
                { value: "email", label: "Email" },
            ],
            sortColumn: "name",
        },
        clients: {
            endpoint: "/admin/clients",
            title: "Gerenciamento de Clientes",
            headers: ["ID", "Nome", "Email", "Telefone", "Criado em"],
            filterOptions: [
                { value: "name", label: "Nome" },
                { value: "email", label: "Email" },
            ],
            sortColumn: "name",
        },
        notifications: {
            title: "Notificações",
        },
        verification: {
            endpoint: "/admin/brokers/pending",
            title: "Solicitações de Corretores",
            headers: ["ID", "Nome", "CRECI", "Documentos", "Acoes"],
            filterOptions: [],
        },
    };

    // Funcao helper para obter configuracao da view com fallback seguro
    function getViewConfig(view: View): ViewConfig {
        return viewConfig[view] || { title: "Dashboard" };
    }

    function isValidView(view: string): view is View {
        return view in viewConfig;
    }

    $: if (!hasAppliedInitialView) {
        activeView = isValidView(initialView) ? initialView : "dashboard";
        hasAppliedInitialView = true;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    async function fetchData() {
        isLoading = true;

        if (
            activeView === "properties" ||
            activeView === "property_requests" ||
            activeView === "sold_properties" ||
            activeView === "negotiation_requests" ||
            activeView === "negotiation_progress" ||
            activeView === "negotiation_contracts" ||
            activeView === "commissions" ||
            activeView === "brokers" ||
            activeView === "create_property" ||
            activeView === "create_user"
        ) {
            headers = [];
            allData = [];
            totalItems = 0;
            isLoading = false;
            return;
        }

        if (!hasSessionToken()) {
            clearSessionToken();
            isLoading = false;
            return;
        }

        if (activeView === "dashboard") {
            try {
                const response = await fetchPlatformResponse(
                    "/admin/dashboard/stats",
                );
                if (!response) {
                    isLoading = false;
                    return;
                }
                if (!response.ok)
                    throw new Error("Falha ao buscar estatísticas");
                stats = await response.json();

                // Fetch SRE stats from session service mock
                if (hasSessionToken()) {
                    const sreResponse = await requestAdminSreStats(
                        localStorage.getItem("session_token") || "",
                    );
                    if (sreResponse?.ok) {
                        sreStats = await sreResponse.json();
                    }
                }
            } catch (error) {
                console.error(
                    "Erro ao buscar estatísticas do dashboard:",
                    error,
                );
                stats = null;
                sreStats = null;
            } finally {
                isLoading = false;
            }
            return;
        }

        if (activeView === "verification") {
            try {
                const params = new URLSearchParams({
                    status: "pending_verification",
                    page: String(currentPage),
                    limit: String(itemsPerPage),
                });
                const response = await fetchPlatformResponse(
                    `/admin/brokers?${params.toString()}`,
                );
                if (!response) {
                    isLoading = false;
                    return;
                }
                if (!response.ok)
                    throw new Error("Falha ao buscar solicitações pendentes");

                const result = await response.json();
                pendingBrokers = result.data || result;
            } catch (error) {
                console.error(
                    "Erro ao buscar solicitações de verificação:",
                    error,
                );
                pendingBrokers = [];
            } finally {
                isLoading = false;
            }
            return;
        }

        const config = getViewConfig(activeView);
        if (!config.endpoint) {
            isLoading = false;
            return;
        }

        const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(itemsPerPage),
            search: searchTerm,
            searchColumn: searchColumn,
            sortBy: sortBy,
            sortOrder: sortOrder,
        });

        if (activeView === "clients" && statusFilter) {
            params.append("status", statusFilter);
        }

        try {
            const response = await fetchPlatformResponse(
                `${config.endpoint}?${params.toString()}`,
            );
            if (!response) {
                isLoading = false;
                return;
            }
            if (!response.ok) throw new Error("Falha na autenticação");

            const result = await response.json();
            allData = result.data || result;
            totalItems = result.total || result.length;
            headers = config.headers || [];
        } catch (error) {
            console.error(`Erro ao buscar dados de ${activeView}:`, error);
            clearSessionToken();
        } finally {
            isLoading = false;
        }
    }

    async function fetchPendingCounts() {
        if (!hasSessionToken()) {
            pendingCounts = { propertyRequests: 0, brokerRequests: 0 };
            clearSessionToken();
            return;
        }

        async function fetchCount(endpoint: string): Promise<number> {
            const response = await fetchPlatformResponse(endpoint);
            if (!response) {
                clearSessionToken();
                return 0;
            }
            if (!response.ok) {
                return 0;
            }
            const payload = await response.json();
            if (payload && typeof payload.total === "number")
                return payload.total;
            if (Array.isArray(payload)) return payload.length;
            if (payload && Array.isArray(payload.data))
                return payload.data.length;
            return 0;
        }

        try {
            const [propertyRequests, brokerRequests] = await Promise.all([
                fetchCount(
                    "/admin/properties-with-brokers?status=pending_approval&limit=1&page=1",
                ),
                fetchCount(
                    "/admin/brokers?status=pending_verification&limit=1&page=1",
                ),
            ]);
            pendingCounts = { propertyRequests, brokerRequests };
        } catch (error) {
            console.error("Erro ao buscar contagem de solicitacoes:", error);
        }
    }

    async function fetchChartData() {
        isChartLoading = true;
        chartError = null;

        if (!hasSessionToken()) {
            clearSessionToken();
            isChartLoading = false;
            return;
        }

        try {
            const response = await fetchPlatformResponse(
                "/admin/stats/dashboard",
            );
            if (!response) {
                isChartLoading = false;
                return;
            }

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Falha ao buscar estatísticas.");
            }

            const payload = await response.json();
            const propertiesByStatus = Array.isArray(
                payload?.propertiesByStatus,
            )
                ? payload.propertiesByStatus.map((item: any) => ({
                      status: String(item?.status ?? "desconhecido"),
                      count: Number(item?.count ?? 0),
                  }))
                : [];

            const newPropertiesOverTime = Array.isArray(
                payload?.newPropertiesOverTime,
            )
                ? payload.newPropertiesOverTime.map((item: any) => ({
                      date: String(item?.date ?? ""),
                      count: Number(item?.count ?? 0),
                  }))
                : [];

            chartData = {
                propertiesByStatus,
                newPropertiesOverTime,
            };
        } catch (error) {
            console.error("Erro ao buscar estatísticas do dashboard:", error);
            chartError = "Não foi possivel carregar os gráficos.";
            chartData = null;
        } finally {
            isChartLoading = false;
        }
    }

    async function changeView(newView: View) {
        if (!isValidView(newView)) {
            console.error("Invalid view: " + newView);
            newView = "dashboard";
        }

        await ensureViewComponents(newView);
        activeView = newView;

        isSidebarOpen = false;
        searchTerm = "";
        searchColumn = "all";
        currentPage = 1;
        statusFilter = "";
        sortBy = "id";
        sortOrder = "desc";
        fetchData();
        fetchPendingCounts();
        if (newView === "dashboard") {
            fetchChartData();
        }
    }

    function handleSortToggle() {
        if (
            activeView === "dashboard" ||
            activeView === "verification" ||
            activeView === "properties" ||
            activeView === "brokers" ||
            activeView === "negotiation_requests" ||
            activeView === "negotiation_progress" ||
            activeView === "negotiation_contracts" ||
            activeView === "commissions"
        )
            return;
        const config = getViewConfig(activeView);
        if (!config.sortColumn) return;

        const alphaSortColumn = config.sortColumn;

        if (sortBy === alphaSortColumn) {
            sortBy = "id";
            sortOrder = "desc";
        } else {
            sortBy = alphaSortColumn;
            sortOrder = "asc";
        }
        currentPage = 1;
        fetchData();
    }

    function openDeleteModal(detail: { id: number; type: string }) {
        itemToDelete = detail;
        showModal = true;
    }

    async function handleDeleteConfirm() {
        if (!itemToDelete) return;
        const { id, type } = itemToDelete;

        const endpoint =
            type === "property"
                ? `/admin/properties/${id}`
                : `/admin/${type}s/${id}`;

        try {
            const response = await fetchPlatformResponse(endpoint, {
                method: "DELETE",
            });
            if (!response) {
                return;
            }
            fetchData();
            fetchPendingCounts();
        } catch (error) {
            console.error(`Erro ao deletar item:`, error);
        } finally {
            showModal = false;
            itemToDelete = null;
        }
    }

    async function handleSave(
        event: CustomEvent<{
            id: number;
            data: Partial<DataItem>;
            type: string;
        }>,
    ) {
        const { id, data, type } = event.detail;

        isSaving = true;

        const endpoint =
            type === "property"
                ? `/admin/properties/${id}`
                : type === "broker"
                  ? `/admin/brokers/${id}`
                  : `/admin/clients/${id}`;

        try {
            const response = await fetchPlatformResponse(endpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response) {
                throw new Error("Falha ao salvar.");
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Erro do servidor:", errorText);
                throw new Error(
                    "Falha ao salvar. Verifique o console para mais detalhes.",
                );
            }

            showSaveMessage("Dados salvos com sucesso!", "success");
            await fetchData();
            await fetchPendingCounts();
        } catch (error: any) {
            console.error(`Erro ao salvar o ${type}:`, error);
            showSaveMessage(`Erro: ${error.message}`, "error");
        } finally {
            isSaving = false;
            handleEditCancel();
        }
    }

    function showSaveMessage(message: string, type: "success" | "error") {
        saveMessage = message;
        saveMessageType = type;
        setTimeout(() => {
            saveMessage = "";
        }, 3000);
    }

    function handleEditStart(event: CustomEvent<DataItem>) {
        editingId = event.detail.id;
        editableItemData = { ...event.detail };
    }

    function handleEditCancel() {
        editingId = null;
        editableItemData = {};
    }

    onMount(async () => {
        await ensureViewComponents(activeView);
        fetchData();
        if (activeView === "dashboard") {
            fetchChartData();
        }
        fetchPendingCounts();
        pendingCountsInterval = setInterval(fetchPendingCounts, 15000);
    });

    onDestroy(() => {
        if (pendingCountsInterval) {
            clearInterval(pendingCountsInterval);
        }
    });

    function applyFilters() {
        currentPage = 1;
        fetchData();
    }

    $: {
        if (
            activeView !== "properties" &&
            activeView !== "brokers" &&
            (searchTerm !== "" || sortBy !== "id" || sortOrder !== "desc")
        ) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                fetchData();
            }, 500);
        }
    }

    //Efeito separado para status filter (sem debounce)
    $: if (
        statusFilter !== "" &&
        activeView !== "properties" &&
        activeView !== "brokers"
    ) {
        currentPage = 1;
        fetchData();
    }

    //  Efeito separado para items per page
    $: if (
        itemsPerPage !== 10 &&
        activeView !== "properties" &&
        activeView !== "brokers"
    ) {
        currentPage = 1;
        fetchData();
    }

    function setStatusFilter(status: string) {
        statusFilter = status;
        // Aplica imediatamente
        currentPage = 1;
        fetchData();
    }

    $: paginatedData = allData;
    $: totalPages = Math.ceil(totalItems / itemsPerPage);
</script>

<div
    class="relative flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white"
>
    <Sidebar
        bind:isOpen={isSidebarOpen}
        {activeView}
        {pendingCounts}
        onNavigate={changeView}
    />

    <div class="flex-1 flex flex-col overflow-hidden lg:pl-64">
        <Header
            pageTitle={getViewConfig(activeView).title}
            onToggleSidebar={() => (isSidebarOpen = !isSidebarOpen)}
        />

        <main class="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
            {#if isLoading}
                <div class="flex justify-center items-center h-64">
                    <div
                        class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                    ></div>
                </div>
            {:else if activeView === "dashboard"}
                <div class="space-y-6">
                    {#if sreStats}
                        <!-- Golden Signals Section (Top Level) -->
                        <section>
                            <div class="mb-4">
                                <h2
                                    class="text-xl font-semibold text-gray-900 dark:text-gray-100"
                                >
                                    Sinais de Ouro SRE
                                </h2>
                                <p
                                    class="text-sm text-gray-500 dark:text-gray-400"
                                >
                                    Monitoramento de saúde e telemetria da
                                    plataforma (Latência, Tráfego, Erros e
                                    Utilização da Nuvem).
                                </p>
                            </div>

                            <div
                                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                            >
                                <SreSignalCard
                                    title="Latência (p99)"
                                    value={sreStats.latency.p99}
                                    unit={sreStats.latency.unit}
                                    status={sreStats.latency.status}
                                    trendDirection={sreStats.latency.trend}
                                    trendValue={sreStats.latency.trendValue}
                                />
                                <SreSignalCard
                                    title="Tráfego"
                                    value={sreStats.traffic.rps}
                                    unit={sreStats.traffic.unit}
                                    status={sreStats.traffic.status}
                                    trendDirection={sreStats.traffic.trend}
                                    trendValue={sreStats.traffic.trendValue}
                                />
                                <SreSignalCard
                                    title="Erros"
                                    value={sreStats.errors.rate}
                                    unit={sreStats.errors.unit}
                                    status={sreStats.errors.status}
                                    trendDirection={sreStats.errors.trend}
                                    trendValue={sreStats.errors.trendValue}
                                />
                                <SreSignalCard
                                    title="Utilização (CPU da Nuvem)"
                                    value={sreStats.saturation.cpu}
                                    unit={sreStats.saturation.unit}
                                    status={sreStats.saturation.status}
                                    trendDirection={sreStats.saturation.trend}
                                    trendValue={sreStats.saturation.trendValue}
                                />
                            </div>
                        </section>

                        <!-- SRE Charts Section (Directly Below Signals) -->
                        <section
                            class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2"
                        >
                            <div
                                class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                            >
                                <h3
                                    class="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-4 opacity-80"
                                >
                                    Latência Histórica
                                </h3>
                                <SreTimeSeriesChart
                                    title="Latência (ms)"
                                    labels={timeLabels}
                                    data={sreStats.latency.history}
                                    borderColor="#3B82F6"
                                    backgroundColor="rgba(59, 130, 246, 0.1)"
                                />
                            </div>
                            <div
                                class="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                            >
                                <h3
                                    class="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-4 opacity-80"
                                >
                                    Taxa de Erros
                                </h3>
                                <SreTimeSeriesChart
                                    title="Erros (%)"
                                    labels={timeLabels}
                                    data={sreStats.errors.history}
                                    borderColor="#EF4444"
                                    backgroundColor="rgba(239, 68, 68, 0.1)"
                                />
                            </div>
                        </section>

                        <!-- SRE Phase 2 & 3: Alerts, Availability, and Release Health -->
                        <section
                            class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
                        >
                            <div class="lg:col-span-2">
                                <SreActionableAlerts
                                    alerts={sreStats.alerts || []}
                                />
                            </div>
                            <div class="lg:col-span-1">
                                <SreAvailability
                                    uptimeCurrent={sreStats.availability
                                        ?.uptimeCurrent || 99.95}
                                    downtimeMinutes={sreStats.availability
                                        ?.downtimeMinutes || 12.5}
                                />
                            </div>
                        </section>

                        <section
                            class="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2"
                        >
                            <div class="h-96">
                                <SreReleaseHealth
                                    releases={sreStats.releases || []}
                                />
                            </div>
                            <div class="h-96">
                                <SreExternalServices
                                    services={sreStats.externalServices || []}
                                />
                            </div>
                        </section>
                    {/if}

                    <section class="opacity-90">
                        <div class="mb-4 mt-6">
                            <h2
                                class="text-lg font-semibold text-gray-900 dark:text-gray-100"
                            >
                                KPIs de Negócio (Visão Geral)
                            </h2>
                        </div>
                        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <KpiCard
                                title="Total de Imóveis"
                                value={stats?.totalProperties ?? 0}
                                color="green"
                            />
                            <KpiCard
                                title="Total de Corretores"
                                value={stats?.totalBrokers ?? 0}
                                color="blue"
                            />
                            <KpiCard
                                title="Total de Usuários"
                                value={stats?.totalUsers ?? 0}
                                color="yellow"
                            />
                            <KpiCard
                                title="Total de Clientes"
                                value={totalClients}
                                color="blue"
                            />
                        </div>
                    </section>
                </div>
            {:else if activeView === "verification"}
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <div class="p-4 border-b dark:border-gray-700">
                        <div
                            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div>
                                <h2
                                    class="text-lg font-semibold text-gray-900 dark:text-white"
                                >
                                    Solicitações de Corretores
                                </h2>
                                <p
                                    class="text-sm text-gray-600 dark:text-gray-400 mt-1"
                                >
                                    {totalItems} solicitaçõ(es) pendente(s)
                                </p>
                            </div>
                            <div
                                class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                            >
                                <label
                                    for="verification-items-per-page"
                                    class="font-medium">Mostrar</label
                                >
                                <select
                                    id="verification-items-per-page"
                                    bind:value={itemsPerPage}
                                    on:change={() => (currentPage = 1)}
                                    class="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span>entradas</span>
                            </div>
                        </div>
                    </div>

                    {#if saveMessage}
                        <div class="p-4 border-b dark:border-gray-700">
                            <div
                                class="p-3 rounded-md text-white {saveMessageType ===
                                'success'
                                    ? 'bg-green-500'
                                    : 'bg-red-500'}"
                            >
                                {saveMessage}
                            </div>
                        </div>
                    {/if}

                    <VerificationTable
                        {pendingBrokers}
                        on:refresh={fetchData}
                    />
                    <div class="p-4 border-t dark:border-gray-700">
                        <Pagination
                            bind:currentPage
                            {totalPages}
                            {totalItems}
                            {itemsPerPage}
                        />
                    </div>
                </div>
            {:else if activeView === "properties"}
                {#if PropertyManagementComponent}
                    <svelte:component this={PropertyManagementComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "property_requests"}
                {#if PropertyManagementComponent}
                    <svelte:component
                        this={PropertyManagementComponent}
                        initialStatus="pending_approval"
                        allowApproval={true}
                    />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "sold_properties"}
                {#if PropertyArchiveComponent}
                    <svelte:component this={PropertyArchiveComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "negotiation_requests"}
                {#if NegotiationRequestsComponent}
                    <svelte:component this={NegotiationRequestsComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "negotiation_progress"}
                {#if NegotiationProgressComponent}
                    <svelte:component this={NegotiationProgressComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "negotiation_contracts"}
                {#if ContractsModuleComponent}
                    <svelte:component this={ContractsModuleComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "commissions"}
                {#if CommissionsModuleComponent}
                    <svelte:component this={CommissionsModuleComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "create_property"}
                {#if CreatePropertyComponent}
                    <svelte:component this={CreatePropertyComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "create_user"}
                {#if CreateUserComponent}
                    <svelte:component this={CreateUserComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "brokers"}
                {#if BrokerManagementComponent}
                    <svelte:component this={BrokerManagementComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "clients"}
                {#if ClientManagementComponent}
                    <svelte:component this={ClientManagementComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "notifications"}
                <div class="space-y-6">
                    <div
                        class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800"
                    >
                        <div
                            class="px-6 py-4 border-b border-gray-200 dark:border-gray-800"
                        >
                            <h1
                                class="text-xl font-semibold text-gray-900 dark:text-gray-100"
                            >
                                Enviar notificação manual
                            </h1>
                            <p
                                class="mt-1 text-sm text-gray-500 dark:text-gray-400"
                            >
                                Envie mensagens manuais para usuários
                                especifícos ou para todos os clientes e
                                corretores da plataforma.
                            </p>
                        </div>
                        <div class="p-6">
                            {#if SendNotificationComponent}
                                <svelte:component
                                    this={SendNotificationComponent}
                                />
                            {:else}
                                <div
                                    class="flex items-center gap-2 text-gray-500 dark:text-gray-300"
                                >
                                    <span
                                        class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600"
                                    ></span>
                                    Carregando...
                                </div>
                            {/if}
                        </div>
                    </div>
                    {#if AdminNotificationsPanelComponent}
                        <svelte:component
                            this={AdminNotificationsPanelComponent}
                        />
                    {/if}
                </div>
            {:else}
                {@const config = getViewConfig(activeView)}
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <div class="p-4 border-b dark:border-gray-700 space-y-4">
                        <div
                            class="flex flex-col sm:flex-row justify-between items-start gap-4"
                        >
                            {#if config.filterOptions && config.filterOptions.length > 0}
                                <FilterControls
                                    bind:itemsPerPage
                                    bind:searchTerm
                                    bind:searchColumn
                                    filterOptions={config.filterOptions}
                                />
                            {/if}
                            <button
                                on:click={handleSortToggle}
                                class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                {#if sortBy === "id"}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        fill="currentColor"
                                        viewBox="0 0 16 16"
                                        ><path
                                            d="M4 13a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4Zm-2-1a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10ZM11.5 7h-1a.5.5 0 0 1 0-1h1a.5.5 0 0 1 0 1Zm-2-3h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1Zm-2 6h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1Z"
                                        /></svg
                                    >
                                    <span>Ordenar A-Z</span>
                                {:else}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        fill="currentColor"
                                        viewBox="0 0 16 16"
                                        ><path
                                            fill-rule="evenodd"
                                            d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"
                                        /><path
                                            d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"
                                        /></svg
                                    >
                                    <span>Ordem Padrão</span>
                                {/if}
                            </button>
                        </div>
                    </div>

                    {#if saveMessage}
                        <div class="p-4 border-b dark:border-gray-700">
                            <div
                                class="p-3 rounded-md text-white {saveMessageType ===
                                'success'
                                    ? 'bg-green-500'
                                    : 'bg-red-500'}"
                            >
                                {saveMessage}
                            </div>
                        </div>
                    {/if}

                    <Table
                        headers={config.headers || []}
                        data={paginatedData}
                        view={activeView}
                        bind:editingId
                        bind:editableItemData
                        {isSaving}
                        on:delete={(e) => openDeleteModal(e.detail)}
                        on:editStart={handleEditStart}
                        on:save={handleSave}
                        on:editCancel={handleEditCancel}
                    />
                    <div class="p-4 border-t dark:border-gray-700">
                        <Pagination
                            bind:currentPage
                            {totalPages}
                            {totalItems}
                            {itemsPerPage}
                        />
                    </div>
                </div>
            {/if}
        </main>
    </div>
</div>

{#if showModal}
    <Modal onConfirm={handleDeleteConfirm} onCancel={() => (showModal = false)}>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-5">
            Confirmar Exclusão
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 px-4 py-3">
            Você tem certeza que deseja excluir o {itemToDelete?.type} de ID {itemToDelete?.id}?
        </p>
    </Modal>
{/if}
