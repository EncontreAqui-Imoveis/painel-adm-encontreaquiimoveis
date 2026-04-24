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
    import SreReleaseHealth from "./components/SreReleaseHealth.svelte";
    import SreExternalServices from "./components/SreExternalServices.svelte";
    import { fetchPlatformResponse } from "./adminFetchService";
    import { clearSessionToken, hasSessionToken } from "./sessionState";
    import { onMount, onDestroy } from "svelte";
    import { fade, slide } from "svelte/transition";
    import { toast } from "svelte-sonner";
    import type {
        Property,
        Broker,
        User,
        Notification,
        NotificationsSubTab,
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
    let showGoldenSignalsHelp = false;

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

    interface DashboardChartData {
        propertiesByStatus: { status: string; count: number }[];
        newPropertiesOverTime: { date: string; count: number }[];
    }
    let chartData: DashboardChartData | null = null;
    let isChartLoading = false;
    let chartError: string | null = null;
    type LazySvelteComponent = any;

    let PropertyManagementComponent: LazySvelteComponent | null = null;
    let PropertyHighlightsComponent: LazySvelteComponent | null = null;
    let PropertyRequestsModuleComponent: LazySvelteComponent | null = null;
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
    let notificationsSubTab: NotificationsSubTab = "send";
    let announcements: Notification[] = [];
    let announcementsTotal = 0;
    const ANNOUNCEMENTS_LAST_READ_STORAGE_KEY =
        "painelweb.notifications.announcements.lastRead";
    type AnnouncementReadMarker = {
        createdAtMs: number;
        id: number;
    };
    let latestAnnouncementMarker: AnnouncementReadMarker | null = null;
    let lastReadAnnouncementMarker: AnnouncementReadMarker | null = null;
    let isAnnouncementsLoading = false;
    let announcementsError: string | null = null;
    const externalDashboardShortcuts = [
        {
            name: "Google Search Console",
            url: "https://search.google.com/search-console",
            description: "SEO e indexação",
            badgeClass:
                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        },
        {
            name: "Vercel",
            url: "https://vercel.com/dashboard",
            description: "Deploy e logs web",
            badgeClass:
                "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900",
        },
        {
            name: "Railway",
            url: "https://railway.com/project",
            description: "Infra backend",
            badgeClass:
                "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        },
        {
            name: "Cloudinary",
            url: "https://console.cloudinary.com/",
            description: "Mídia e transformação",
            badgeClass:
                "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
        },
        {
            name: "Cloudflare",
            url: "https://dash.cloudflare.com/",
            description: "DNS, WAF e cache",
            badgeClass:
                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        },
        {
            name: "Brevo",
            url: "https://app.brevo.com/",
            description: "E-mails transacionais",
            badgeClass:
                "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        },
        {
            name: "Firebase",
            url: "https://console.firebase.google.com/",
            description: "Auth e push",
            badgeClass:
                "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
        },
        {
            name: "Play Console",
            url: "https://play.google.com/console",
            description: "App Android",
            badgeClass:
                "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
        },
        {
            name: "Apple",
            url: "https://appstoreconnect.apple.com/",
            description: "App Store Connect",
            badgeClass:
                "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        },
        {
            name: "TiDB",
            url: "https://tidbcloud.com",
            description: "Banco de dados e observabilidade",
            badgeClass:
                "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
        },
        {
            name: "GitHub",
            url: "https://github.com/orgs/EncontreAqui-Imoveis",
            description: "Repositórios e automações",
            badgeClass:
                "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
        },
    ] as const;

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
        if (view === "properties") {
            if (!PropertyManagementComponent) {
                const module = await import("./PropertyManagement.svelte");
                PropertyManagementComponent = module.default;
            }
            return;
        }
        if (view === "property_highlights") {
            if (!PropertyHighlightsComponent) {
                const module = await import("./PropertyHighlightsView.svelte");
                PropertyHighlightsComponent = module.default;
            }
            return;
        }
        if (view === "property_requests") {
            if (!PropertyRequestsModuleComponent) {
                const module = await import(
                    "./components/PropertyRequestsModule.svelte"
                );
                PropertyRequestsModuleComponent = module.default;
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
            title: "Imóveis disponíveis",
            headers: [
                "ID",
                "Código",
                "Título",
                "Tipo",
                "Status",
                "Preço",
                "Cidade",
                "Anunciante",
            ],
            filterOptions: [
                { value: "p.id", label: "ID" },
                { value: "p.code", label: "Código" },
                { value: "p.title", label: "Título" },
            ],
            sortColumn: "p.title",
        },
        property_requests: {
            title: "Solicitações de Imóveis",
        },
        property_highlights: {
            title: "Destaques",
        },
        sold_properties: {
            title: "Imóveis vendidos ou alugados",
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
                "Total de Imóveis",
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
            headers: ["ID", "Nome", "CRECI", "Documentos", "Ações"],
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
            activeView === "property_highlights" ||
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

                // Fetch SRE stats using the standard platform fetch service
                const sreResponse = await fetchPlatformResponse(
                    "/admin/dashboard/sre",
                );
                if (sreResponse && sreResponse.ok) {
                    sreStats = await sreResponse.json();
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
            allData = [];
            totalItems = 0;
            headers = config.headers || [];
        } finally {
            isLoading = false;
        }
    }

    /** Total em respostas paginadas do admin (MySQL costuma enviar COUNT como string). */
    function readListTotal(payload: unknown): number {
        if (payload == null) return 0;
        if (Array.isArray(payload)) return payload.length;
        if (typeof payload !== "object") return 0;
        const raw = (payload as { total?: unknown }).total;
        if (typeof raw === "number" && Number.isFinite(raw)) return raw;
        if (typeof raw === "string" && raw.trim() !== "") {
            const n = Number(raw);
            if (Number.isFinite(n)) return n;
        }
        if (typeof raw === "bigint") return Number(raw);
        return 0;
    }

    function readListData<T>(payload: unknown): T[] {
        if (Array.isArray(payload)) return payload as T[];
        if (payload && typeof payload === "object") {
            const data = (payload as { data?: unknown }).data;
            if (Array.isArray(data)) return data as T[];
        }
        return [];
    }

    function formatNotificationDate(value: string): string {
        if (!value) return "-";
        const normalized = value.includes("T") ? value : value.replace(" ", "T");
        const parsed = new Date(normalized);
        if (Number.isNaN(parsed.getTime())) return value;
        return parsed.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getNotificationMetadata(
        item: Notification,
    ): Record<string, unknown> | null {
        const raw = item.metadata_json;
        if (!raw) return null;
        if (typeof raw === "string") {
            try {
                const parsed = JSON.parse(raw);
                return parsed && typeof parsed === "object"
                    ? (parsed as Record<string, unknown>)
                    : null;
            } catch {
                return null;
            }
        }
        return typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    }

    function getMetadataString(
        metadata: Record<string, unknown> | null,
        key: string,
    ): string | null {
        const value = metadata?.[key];
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    function getAnnouncementClientPhone(item: Notification): string | null {
        return getMetadataString(getNotificationMetadata(item), "clientPhone");
    }

    function getAnnouncementWhatsappUrl(item: Notification): string | null {
        return getMetadataString(getNotificationMetadata(item), "whatsappUrl");
    }

    function parseAnnouncementCreatedAtMs(createdAt: string): number {
        const parsed = Date.parse(createdAt);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function extractAnnouncementMarker(
        item: Notification | null | undefined,
    ): AnnouncementReadMarker | null {
        if (!item || typeof item.id !== "number") return null;
        return {
            createdAtMs: parseAnnouncementCreatedAtMs(item.created_at),
            id: item.id,
        };
    }

    function isAnnouncementMarkerNewer(
        candidate: AnnouncementReadMarker | null,
        reference: AnnouncementReadMarker | null,
    ): boolean {
        if (!candidate) return false;
        if (!reference) return true;
        if (candidate.createdAtMs > reference.createdAtMs) return true;
        if (candidate.createdAtMs < reference.createdAtMs) return false;
        return candidate.id > reference.id;
    }

    function getMostRecentAnnouncementMarker(
        list: Notification[],
    ): AnnouncementReadMarker | null {
        let mostRecent: AnnouncementReadMarker | null = null;
        for (const item of list) {
            const marker = extractAnnouncementMarker(item);
            if (isAnnouncementMarkerNewer(marker, mostRecent)) {
                mostRecent = marker;
            }
        }
        return mostRecent;
    }

    function readLastReadAnnouncementMarkerFromStorage():
        | AnnouncementReadMarker
        | null {
        if (typeof window === "undefined") return null;
        const raw = window.localStorage.getItem(
            ANNOUNCEMENTS_LAST_READ_STORAGE_KEY,
        );
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as {
                createdAtMs?: unknown;
                id?: unknown;
            };
            const createdAtMs = Number(parsed.createdAtMs);
            const id = Number(parsed.id);
            if (!Number.isFinite(createdAtMs) || !Number.isFinite(id)) {
                return null;
            }
            return { createdAtMs, id };
        } catch {
            return null;
        }
    }

    function persistLastReadAnnouncementMarker(
        marker: AnnouncementReadMarker,
    ): void {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(
            ANNOUNCEMENTS_LAST_READ_STORAGE_KEY,
            JSON.stringify(marker),
        );
    }

    function markAnnouncementsAsRead() {
        const markerToPersist =
            getMostRecentAnnouncementMarker(announcements) ??
            latestAnnouncementMarker;
        if (!markerToPersist) return;
        lastReadAnnouncementMarker = markerToPersist;
        persistLastReadAnnouncementMarker(markerToPersist);
    }

    $: announcementsUnreadVisualCount =
        announcementsTotal > 0 &&
        isAnnouncementMarkerNewer(
            latestAnnouncementMarker,
            lastReadAnnouncementMarker,
        )
            ? announcementsTotal
            : 0;

    async function fetchAnnouncementsCount() {
        try {
            const response = await fetchPlatformResponse(
                "/admin/notifications?type=announcement&limit=1&page=1",
            );
            if (!response || !response.ok) {
                announcementsTotal = 0;
                return;
            }
            const payload = await response.json();
            announcementsTotal = readListTotal(payload);
            const mostRecentFromCount =
                getMostRecentAnnouncementMarker(readListData<Notification>(payload));
            latestAnnouncementMarker = mostRecentFromCount;
        } catch (error) {
            console.error("Erro ao buscar total de avisos:", error);
            announcementsTotal = 0;
            latestAnnouncementMarker = null;
        }
    }

    async function fetchAnnouncements(
        options: { markAsRead?: boolean } = {},
    ): Promise<boolean> {
        isAnnouncementsLoading = true;
        announcementsError = null;
        try {
            const response = await fetchPlatformResponse(
                "/admin/notifications?type=announcement&limit=20&page=1",
            );
            if (!response || !response.ok) {
                throw new Error("Falha ao carregar avisos.");
            }
            const payload = await response.json();
            announcements = readListData<Notification>(payload);
            const totalFromPayload = readListTotal(payload);
            announcementsTotal =
                totalFromPayload > 0 ? totalFromPayload : announcements.length;
            latestAnnouncementMarker =
                getMostRecentAnnouncementMarker(announcements);
            if (options.markAsRead) {
                markAnnouncementsAsRead();
            }
            return true;
        } catch (error) {
            console.error("Erro ao buscar avisos:", error);
            announcementsError =
                error instanceof Error
                    ? error.message
                    : "Não foi possível carregar os avisos.";
            announcements = [];
            announcementsTotal = 0;
            latestAnnouncementMarker = null;
            return false;
        } finally {
            isAnnouncementsLoading = false;
        }
    }

    async function clearAnnouncementNotifications() {
        if (isAnnouncementsLoading || announcements.length === 0) return;
        const confirmed = window.confirm("Deseja limpar todos os avisos?");
        if (!confirmed) return;

        isAnnouncementsLoading = true;
        announcementsError = null;
        try {
            const response = await fetchPlatformResponse(
                "/admin/notifications/announcements",
                { method: "DELETE" },
            );
            if (!response || !response.ok) {
                throw new Error("Não foi possível limpar os avisos.");
            }
            announcements = [];
            announcementsTotal = 0;
            latestAnnouncementMarker = null;
            lastReadAnnouncementMarker = null;
            if (typeof window !== "undefined") {
                window.localStorage.removeItem(
                    ANNOUNCEMENTS_LAST_READ_STORAGE_KEY,
                );
            }
            toast.success("Avisos removidos com sucesso.");
        } catch (error) {
            console.error("Erro ao limpar avisos:", error);
            announcementsError =
                error instanceof Error
                    ? error.message
                    : "Não foi possível limpar os avisos.";
        } finally {
            isAnnouncementsLoading = false;
            await fetchAnnouncementsCount();
        }
    }

    async function handleNotificationsSubTabChange(tab: NotificationsSubTab) {
        notificationsSubTab = tab;
        if (tab === "announcements") {
            await fetchAnnouncements({ markAsRead: true });
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
            return readListTotal(payload);
        }

        try {
            const [creationRequests, editRequests, brokerRequests] = await Promise.all([
                fetchCount(
                    "/admin/properties-with-brokers?status=pending_approval&limit=1&page=1",
                ),
                fetchCount(
                    "/admin/property-edit-requests?status=PENDING&limit=1&page=1",
                ),
                fetchCount(
                    "/admin/brokers?status=pending_verification&limit=1&page=1",
                ),
            ]);
            pendingCounts = {
                propertyRequests: creationRequests + editRequests,
                brokerRequests,
            };
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
            chartError = "Não foi possível carregar os gráficos.";
            chartData = null;
        } finally {
            isChartLoading = false;
        }
    }

    async function changeView(
        newView: View,
        nextNotificationsSubTab: NotificationsSubTab = "send",
    ) {
        if (!isValidView(newView)) {
            console.error("Invalid view: " + newView);
            newView = "dashboard";
        }

        // Atualizar já para o menu e o sync URL (hashchange/popstate) não lerem a view antiga
        // enquanto ensureViewComponents ainda está a carregar módulos.
        activeView = newView;

        await ensureViewComponents(newView);

        isSidebarOpen = false;
        searchTerm = "";
        searchColumn = "all";
        currentPage = 1;
        statusFilter = "";
        sortBy = "id";
        sortOrder = "desc";
        fetchData();
        fetchPendingCounts();
        if (newView === "notifications") {
            notificationsSubTab = nextNotificationsSubTab;
            await fetchAnnouncementsCount();
            if (nextNotificationsSubTab === "announcements") {
                await fetchAnnouncements({ markAsRead: true });
            }
        }
        if (newView === "dashboard") {
            fetchChartData();
        }
    }

    async function handlePropertyCreated() {
        await changeView("properties");
    }

    function handleSortToggle() {
        if (
            activeView === "dashboard" ||
            activeView === "verification" ||
            activeView === "properties" ||
            activeView === "property_highlights" ||
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
        lastReadAnnouncementMarker = readLastReadAnnouncementMarkerFromStorage();
        await ensureViewComponents(activeView);
        fetchData();
        if (activeView === "dashboard") {
            fetchChartData();
        }
        fetchAnnouncementsCount();
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
    async function handleUpdatePrice(
        event: CustomEvent<{ name: string; cost: number }>,
    ) {
        const { name, cost } = event.detail;
        const response = await fetchPlatformResponse(
            `/admin/dashboard/sre/external-services/${name}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cost }),
            },
        );

        if (response && response.ok) {
            await fetchData(); // Refresh data using the existing fetchData function
        }
    }
</script>

<div
    class="relative flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white"
>
    <Sidebar
        bind:isOpen={isSidebarOpen}
        {activeView}
        {pendingCounts}
        announcementsBadge={announcementsUnreadVisualCount}
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
                    <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div class="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
                            <p class="text-sm font-semibold text-amber-900 dark:text-amber-200">Pendências urgentes</p>
                            <p class="mt-2 text-3xl font-black text-amber-700 dark:text-amber-300">
                                {(pendingCounts.propertyRequests ?? 0) + (pendingCounts.brokerRequests ?? 0)}
                            </p>
                            <p class="mt-1 text-xs text-amber-800 dark:text-amber-200/90">
                                Aprovações de imóveis e solicitações de corretores aguardando ação.
                            </p>
                            <button
                                class="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                                on:click={() => changeView("property_requests")}
                            >
                                Ir para pendências
                            </button>
                        </div>

                        <div class="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20">
                            <p class="text-sm font-semibold text-blue-900 dark:text-blue-200">Novas propostas do dia</p>
                            <p class="mt-2 text-3xl font-black text-blue-700 dark:text-blue-300">
                                {Number(sreStats?.business?.newProposalsToday ?? sreStats?.newProposalsToday ?? 0)}
                            </p>
                            <p class="mt-1 text-xs text-blue-800 dark:text-blue-200/90">
                                Volume diário para triagem rápida de negociação.
                            </p>
                            <button
                                class="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                on:click={() => changeView("negotiation_requests")}
                            >
                                Abrir propostas
                            </button>
                        </div>
                    </section>

                    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Visitas e leads</h2>
                        <p class="mb-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Tendência recente para leitura rápida de operação.
                        </p>
                        {#if NewPropertiesLineChartComponent && chartData}
                            <div class="h-72">
                                <svelte:component this={NewPropertiesLineChartComponent} data={chartData.newPropertiesOverTime} />
                            </div>
                        {:else}
                            <div class="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                Sem dados de gráfico no momento.
                            </div>
                        {/if}
                    </section>

                    <div class="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#0b0f1a]">
                        <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <h3 class="text-sm font-black uppercase tracking-[0.18em] text-gray-900 dark:text-white">
                                    Atalhos Operacionais
                                </h3>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Acessos rápidos para monitoramento, deploy e canais oficiais.
                                </p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {#each externalDashboardShortcuts as shortcut}
                                <a
                                    href={shortcut.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="group rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-indigo-500/40"
                                >
                                    <div class="flex items-center justify-between gap-2">
                                        <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {shortcut.name}
                                        </p>
                                        <span class={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${shortcut.badgeClass}`}>
                                            Link
                                        </span>
                                    </div>
                                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        {shortcut.description}
                                    </p>
                                </a>
                            {/each}
                        </div>
                    </div>

                    {#if false && sreStats}
                        <!-- SRE Command Center Enclosure -->
                        <section
                            class="bg-white dark:bg-[#05070a] rounded-[2.5rem] p-6 lg:p-8 shadow-sm dark:shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-gray-200 dark:border-gray-800/60 relative overflow-hidden"
                        >
                            <!-- Background Elements -->
                            <div
                                class="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"
                            ></div>
                            <div
                                class="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"
                            ></div>

                            <div class="relative z-10">
                                <div
                                    class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div>
                                        <div class="flex items-center gap-3">
                                            <h2
                                                class="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3"
                                            >
                                                <svg
                                                    class="w-6 h-6 text-emerald-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                                    />
                                                </svg>
                                                Central de Comando SRE
                                            </h2>
                                            <p
                                                class="text-[11px] text-gray-500 mt-1 font-bold tracking-[0.2em] uppercase"
                                            >
                                                Telemetria & Continuidade de
                                                Negócios
                                            </p>
                                        </div>
                                        <button
                                            on:click={() =>
                                                (showGoldenSignalsHelp = true)}
                                            class="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all font-bold text-xs uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20"
                                            aria-label="O que são os 4 Golden Signals?"
                                        >
                                            <svg
                                                class="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            Como ler este painel?
                                        </button>
                                    </div>
                                </div>

                                <!-- Four Golden Signals Grid -->
                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
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
                                        title="Saturação (CPU/MEM)"
                                        value={sreStats.saturation.cpu}
                                        unit={sreStats.saturation.unit}
                                        status={sreStats.saturation.status}
                                        trendDirection={sreStats.saturation
                                            .trend}
                                        trendValue={sreStats.saturation
                                            .trendValue}
                                    />
                                </div>

                                <!-- Middle Section: Quick Railway Status Link -->
                                <div
                                    class="mb-6 py-4 bg-white dark:bg-[#0b0f1a] rounded-3xl border border-gray-200 dark:border-gray-800 px-6 flex flex-col md:flex-row justify-between items-center relative overflow-hidden group shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] gap-4"
                                >
                                    <div
                                        class="absolute inset-0 bg-gradient-to-r from-indigo-50 dark:from-indigo-500/5 to-transparent z-0"
                                    ></div>
                                    <div
                                        class="relative z-10 flex flex-col justify-center text-center md:text-left"
                                    >
                                        <h3
                                            class="text-[12px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white"
                                        >
                                            Status Global do Ecossistema
                                        </h3>
                                        <p
                                            class="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mt-1"
                                        >
                                            Monitoramento contínuo de
                                            disponibilidade de provedores
                                        </p>
                                    </div>
                                    <div
                                        class="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto"
                                    >
                                        <a
                                            href="https://status.railway.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-900 dark:bg-emerald-500/10 text-white dark:text-emerald-400 font-black text-[10px] sm:text-xs uppercase tracking-widest border border-transparent dark:border-emerald-500/20 hover:bg-gray-800 dark:hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-md dark:shadow-[0_0_15px_rgba(16,185,129,0.3)] w-full sm:w-auto"
                                        >
                                            <div
                                                class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                                            ></div>
                                            Railway Status
                                            <svg
                                                class="w-4 h-4 ml-1 opacity-80 group-hover:translate-x-1 transition-transform"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="3"
                                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                                />
                                            </svg>
                                        </a>
                                        <a
                                            href="https://www.vercel-status.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white font-black text-[10px] sm:text-xs uppercase tracking-widest border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] w-full sm:w-auto"
                                        >
                                            <div
                                                class="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                                            ></div>
                                            Vercel Status
                                            <svg
                                                class="w-4 h-4 ml-1 opacity-80 group-hover:translate-x-1 transition-transform"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="3"
                                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                                />
                                            </svg>
                                        </a>
                                    </div>
                                </div>

                                <div class="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#0b0f1a]">
                                    <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
                                        <div>
                                            <h3 class="text-sm font-black uppercase tracking-[0.18em] text-gray-900 dark:text-white">
                                                Atalhos Operacionais
                                            </h3>
                                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Acessos rápidos para monitoramento, deploy e canais oficiais.
                                            </p>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {#each externalDashboardShortcuts as shortcut}
                                            <a
                                                href={shortcut.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="group rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-indigo-500/40"
                                            >
                                                <div class="flex items-center justify-between gap-2">
                                                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                        {shortcut.name}
                                                    </p>
                                                    <span class={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${shortcut.badgeClass}`}>
                                                        Link
                                                    </span>
                                                </div>
                                                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    {shortcut.description}
                                                </p>
                                            </a>
                                        {/each}
                                    </div>
                                </div>

                                <!-- Bottom Section: Releases and External Services -->
                                <div
                                    class="grid grid-cols-1 lg:grid-cols-2 gap-6"
                                >
                                    <div
                                        class="h-[400px] relative overflow-hidden bg-white/50 dark:bg-[#0b0f1a]/50 rounded-3xl border border-gray-200 dark:border-gray-800/50"
                                    >
                                        <SreReleaseHealth
                                            releases={sreStats.releases || {}}
                                        />
                                    </div>
                                    <div class="h-[400px]">
                                        <SreExternalServices
                                            services={sreStats.externalServices ||
                                                []}
                                            on:updatePrice={handleUpdatePrice}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    {/if}

                    <!-- Golden Signals Help Modal -->
                    {#if showGoldenSignalsHelp}
                        <div
                            class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
                            transition:fade={{ duration: 200 }}
                        >
                            <div
                                class="absolute inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm"
                                role="presentation"
                                on:click={() => (showGoldenSignalsHelp = false)}
                            ></div>
                            <div
                                class="relative bg-white dark:bg-[#0b0f1a] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar"
                                transition:slide={{ duration: 300, axis: "y" }}
                            >
                                <!-- Modal Header -->
                                <div
                                    class="px-6 py-5 border-b border-gray-200 dark:border-gray-800/60 sticky top-0 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-md z-10 flex justify-between items-center"
                                >
                                    <div>
                                        <h3
                                            class="font-black text-gray-900 dark:text-white flex items-center gap-3 text-lg tracking-tight"
                                        >
                                            <svg
                                                class="w-5 h-5 text-indigo-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                                />
                                            </svg>
                                            Guia: Os 4 Golden Signals
                                        </h3>
                                        <p
                                            class="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-[0.2em] uppercase mt-2"
                                        >
                                            A métrica padrão do Google SRE para
                                            leigos
                                        </p>
                                    </div>
                                    <button
                                        on:click={() =>
                                            (showGoldenSignalsHelp = false)}
                                        class="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                                        aria-label="Fechar Guia"
                                    >
                                        <svg
                                            class="w-5 h-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                <!-- Modal Body -->
                                <div class="p-6 sm:p-8 space-y-8">
                                    <p
                                        class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
                                    >
                                        A <span
                                            class="font-black text-gray-900 dark:text-white"
                                            >Central de Comando SRE (Site
                                            Reliability Engineering)</span
                                        > monitora e exibe dados críticos e dependências
                                        automáticas em tempo real para garantir que
                                        seus serviços parceiros e métricas vitais
                                        de saúde estejam 100% operacionais.
                                    </p>

                                    <!-- Golden Signals Section -->
                                    <div class="space-y-4">
                                        <h4
                                            class="text-lg font-black dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 flex items-center gap-3"
                                        >
                                            <span
                                                class="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black"
                                                >1</span
                                            >
                                            Os 4 Sinais de Ouro (Métricas Mestra)
                                        </h4>
                                        <div
                                            class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                        >
                                            <!-- Latência -->
                                            <div
                                                class="bg-gray-50 dark:bg-[#111827] p-5 rounded-2xl border border-gray-200 dark:border-gray-800"
                                            >
                                                <div
                                                    class="flex items-center gap-3 mb-3"
                                                >
                                                    <div
                                                        class="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                                                    >
                                                        <svg
                                                            class="w-4 h-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            ><path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            /></svg
                                                        >
                                                    </div>
                                                    <h4
                                                        class="font-black text-gray-900 dark:text-white tracking-tight"
                                                    >
                                                        Latência (Tempo de
                                                        Resposta)
                                                    </h4>
                                                </div>
                                                <p
                                                    class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed"
                                                >
                                                    <strong
                                                        class="text-gray-900 dark:text-gray-300"
                                                        >O que é:</strong
                                                    >
                                                    O tempo que o servidor demora
                                                    para atender uma solicitação
                                                    do cliente.
                                                    <br /><br />
                                                    <strong
                                                        class="text-gray-900 dark:text-gray-300"
                                                        >Como ler:</strong
                                                    >
                                                    Aqui medimos o
                                                    <span
                                                        class="italic font-bold text-indigo-500"
                                                        >p99</span
                                                    > (percentil 99). Isso significa
                                                    que se o valor for "1ms", 99%
                                                    dos seus clientes estão sendo
                                                    atendidos num piscar de olhos
                                                    (1 milissegundo). Quanto menor,
                                                    melhor.
                                                </p>
                                            </div>

                                            <!-- Tráfego -->
                                            <div
                                                class="bg-gray-50 dark:bg-[#111827] p-5 rounded-2xl border border-gray-200 dark:border-gray-800"
                                            >
                                                <div
                                                    class="flex items-center gap-3 mb-3"
                                                >
                                                    <div
                                                        class="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                                                    >
                                                        <svg
                                                            class="w-4 h-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            ><path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                                            /></svg
                                                        >
                                                    </div>
                                                    <h4
                                                        class="font-black text-gray-900 dark:text-white tracking-tight"
                                                    >
                                                        Tráfego (Demanda)
                                                    </h4>
                                                </div>
                                                <p
                                                    class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed"
                                                >
                                                    <strong
                                                        class="text-gray-900 dark:text-gray-300"
                                                        >O que é:</strong
                                                    >
                                                    O volume total de uso do sistema
                                                    em um determinado momento.<br
                                                    /><br />
                                                    <strong
                                                        class="text-gray-900 dark:text-gray-300"
                                                        >Como ler:</strong
                                                    >
                                                    Medido em
                                                    <span
                                                        class="italic font-bold text-indigo-500"
                                                        >req/s</span
                                                    > (Requisições por Segundo).
                                                    São quantas ações os clientes
                                                    estão pedindo ao servidor a cada
                                                    segundo (ex: navegar por páginas,
                                                    fazer login, buscar imóveis).
                                                </p>
                                            </div>

                                            <!-- Erros -->
                                            <div
                                                class="bg-gray-50 dark:bg-[#111827] p-5 rounded-2xl border border-gray-200 dark:border-gray-800"
                                            >
                                                <div
                                                    class="flex items-center gap-3 mb-3"
                                                >
                                                    <div
                                                        class="w-8 h-8 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center"
                                                    >
                                                        <svg
                                                            class="w-4 h-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            ><path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                                            /></svg
                                                        >
                                                    </div>
                                                    <h4
                                                        class="font-black text-gray-900 dark:text-white tracking-tight"
                                                    >
                                                        Taxa de Erros
                                                    </h4>
                                                </div>
                                                <p
                                                    class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed"
                                                >
                                                    <strong
                                                        class="text-gray-900 dark:text-gray-300"
                                                        >O que é:</strong
                                                    >
                                                    A porcentagem de requisições
                                                    que estão falhando e não entregando
                                                    o que o cliente pediu.<br
                                                    /><br />
                                                    <strong
                                                        class="text-gray-900 dark:text-gray-300"
                                                        >Como ler:</strong
                                                    >
                                                    Idealmente deve estar perto de
                                                    <span
                                                        class="italic font-bold text-indigo-500"
                                                        >0%</span
                                                    >. Se começar a subir,
                                                    significa que seus clientes
                                                    estão enfrentando telas de
                                                    erro ou não conseguem
                                                    carregar os dados.
                                                </p>
                                            </div>

                                            <!-- Saturação -->
                                            <div
                                                class="bg-gray-50 dark:bg-[#111827] p-5 rounded-2xl border border-gray-200 dark:border-gray-800"
                                            >
                                                <div
                                                    class="flex items-center gap-3 mb-3"
                                                >
                                                    <div
                                                        class="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center"
                                                    >
                                                        <svg
                                                            class="w-4 h-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            ><path
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                stroke-width="2"
                                                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                                            /></svg
                                                        >
                                                    </div>
                                                    <h4
                                                        class="font-black text-gray-900 dark:text-white tracking-tight"
                                                    >
                                                        Saturação (Gargalo)
                                                    </h4>
                                                </div>
                                                <p
                                                    class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed"
                                                >
                                                    <strong
                                                        class="text-gray-900 dark:text-gray-300"
                                                        >O que é:</strong
                                                    >
                                                    O quão "cheio" os componentes
                                                    de infraestrutura estão.<br
                                                    /><br />
                                                    <strong
                                                        class="text-gray-900 dark:text-gray-300"
                                                        >Como ler:</strong
                                                    >
                                                    Mede o uso de RAM ou Processador
                                                    (o que estiver mais crítico).
                                                    Se este valor chegar perto dos
                                                    <span
                                                        class="italic font-bold text-indigo-500"
                                                        >100%</span
                                                    >, o servidor irá travar ou
                                                    engasgar, causando piora
                                                    instantânea na Latência e
                                                    nos Erros.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Section 2: Timeline & Infrastructure -->
                                    <div class="space-y-4">
                                        <h4
                                            class="text-lg font-black dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 flex items-center gap-3"
                                        >
                                            <span
                                                class="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black"
                                                >2</span
                                            >
                                            Linha do Tempo e Estrutura
                                        </h4>
                                        <div
                                            class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-[#111827] p-5 rounded-2xl border border-gray-200 dark:border-gray-800"
                                        >
                                            As pílulas de <strong
                                                ><span
                                                    class="text-gray-900 dark:text-gray-200"
                                                    >Acesso Rápido</span
                                                ></strong
                                            >
                                            na esquerda o direcionam instantaneamente
                                            para as telas mestres das nossas gigantes
                                            da nuvem e armazenamento. <br /><br
                                            />
                                            Abaixo disso, a
                                            <strong
                                                ><span
                                                    class="text-gray-900 dark:text-gray-200"
                                                    >Linha do Tempo de
                                                    Lançamentos</span
                                                ></strong
                                            >
                                            espelha os "Commits/Deploys" (atualizações
                                            que os desenvolvedores injetam no Github
                                            para a plataforma). Ela serve para que
                                            os administradores entendam exatamente
                                            o que acabou de mudar no painel e funciona
                                            assim:
                                            <ul
                                                class="list-none mt-4 space-y-3"
                                            >
                                                <li
                                                    class="flex items-center gap-3"
                                                >
                                                    <span
                                                        class="w-3 h-3 rounded-full bg-purple-500 animate-pulse border-2 border-purple-500/30"
                                                    ></span>
                                                    Uma bolinha
                                                    <strong
                                                        >Roxa Piscante</strong
                                                    > significa que o servidor contendo
                                                    a inovação está sendo construído
                                                    (building). Não afeta quem navega.
                                                </li>
                                                <li
                                                    class="flex items-center gap-3"
                                                >
                                                    <span
                                                        class="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"
                                                    ></span>
                                                    Uma bolinha
                                                    <strong
                                                        >Azul ou Verde</strong
                                                    > atesta que a atualização é
                                                    um sucesso, não quebrou nada
                                                    e já está ao vivo para todos
                                                    sadios e salvos.
                                                </li>
                                                <li
                                                    class="flex items-center gap-3"
                                                >
                                                    <span
                                                        class="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"
                                                    ></span>
                                                    Uma bolinha
                                                    <strong>Vermelha</strong> expõe
                                                    que um erro crítico da equipe
                                                    interceptou as coisas (failed).
                                                    Uma equipe já está sendo alertada
                                                    via pager.
                                                </li>
                                            </ul>
                                        </div>
                                    </div>

                                    <!-- Section 3: External Services -->
                                    <div class="space-y-4">
                                        <h4
                                            class="text-lg font-black dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3 flex items-center gap-3"
                                        >
                                            <span
                                                class="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black"
                                                >3</span
                                            >
                                            Dependências Externas (SaaS/PaaS)
                                        </h4>
                                        <p
                                            class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-[#111827] p-5 rounded-2xl border border-gray-200 dark:border-gray-800"
                                        >
                                            No último bloco abaixo, o painel
                                            lista de maneira compacta todos os
                                            seus <strong
                                                class="text-gray-900 dark:text-gray-300"
                                                >Terceirizados Tecnológicos</strong
                                            >, ou seja, se a AWS (Amazon),
                                            OpenAI ou Meta (Whatsapp) caírem
                                            globalmente num apagão subitamente,
                                            você saberá graças ao selo
                                            "Instável/Critico" na caixinha
                                            lateral.<br /><br />
                                            Neste painel interativo,
                                            <strong
                                                ><span class="text-indigo-500"
                                                    >você é quem dita os valores
                                                    do mês</span
                                                ></strong
                                            >. Basta clicar diretamente no preço
                                            em R$ associado a um serviço e
                                            digitar a fatura ou limite de
                                            faturamento estipulado para ele
                                            neste mês. O sistema salvará dentro
                                            do próprio navegador localmente e
                                            dará o Somatório Operacional ali no
                                            rodapé instantaneamente.
                                        </p>
                                    </div>

                                    <div
                                        class="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-500/20"
                                    >
                                        <p
                                            class="text-xs font-bold text-emerald-800 dark:text-emerald-400"
                                        >
                                            💡 Dica: No SRE da EncontreAqui,
                                            utilizamos as cores para facilitar:
                                            Verde (Excelente), Amarelo
                                            (Atenção/Degradado) e Vermelho
                                            (Incidente Crítico). Apenas fique
                                            atento se algum card mudar de cor.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div class="mb-4">
                            <h2
                                class="text-lg font-semibold text-gray-900 dark:text-gray-100"
                            >
                                KPIs de Negócio (Visão Geral)
                            </h2>
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            {:else if activeView === "property_highlights"}
                {#if PropertyHighlightsComponent}
                    <svelte:component this={PropertyHighlightsComponent} />
                {:else}
                    <div class="flex justify-center items-center h-64">
                        <div
                            class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"
                        ></div>
                    </div>
                {/if}
            {:else if activeView === "property_requests"}
                {#if PropertyRequestsModuleComponent}
                    <svelte:component this={PropertyRequestsModuleComponent} />
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
                    <svelte:component
                        this={CreatePropertyComponent}
                        on:created={handlePropertyCreated}
                    />
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
                                Notificações
                            </h1>
                            <p
                                class="mt-1 text-sm text-gray-500 dark:text-gray-400"
                            >
                                Gerencie disparos, consulte o histórico e acompanhe
                                os avisos enviados para clientes e corretores.
                            </p>
                        </div>
                        <div class="p-6">
                            {#if notificationsSubTab === "send"}
                                {#if SendNotificationComponent}
                                    <SendNotificationComponent />
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
                            {:else if notificationsSubTab === "center"}
                                {#if AdminNotificationsPanelComponent}
                                    <AdminNotificationsPanelComponent />
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
                            {:else}
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between gap-3">
                                        <h2
                                            class="text-lg font-semibold text-gray-900 dark:text-gray-100"
                                        >
                                            Avisos recentes
                                        </h2>
                                        <div class="flex items-center gap-2">
                                            <button
                                                type="button"
                                                on:click={clearAnnouncementNotifications}
                                                disabled={isAnnouncementsLoading || announcements.length === 0}
                                                class="inline-flex items-center justify-center rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
                                            >
                                                Limpar Tudo
                                            </button>
                                            <button
                                                type="button"
                                                on:click={() =>
                                                    fetchAnnouncements({
                                                        markAsRead: true,
                                                    })}
                                                class="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                            >
                                                Atualizar
                                            </button>
                                        </div>
                                    </div>

                                    {#if isAnnouncementsLoading}
                                        <div
                                            class="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            Carregando avisos...
                                        </div>
                                    {:else if announcementsError}
                                        <div
                                            class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                                        >
                                            {announcementsError}
                                        </div>
                                    {:else if announcements.length === 0}
                                        <div
                                            class="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
                                        >
                                            Nenhum aviso encontrado.
                                        </div>
                                    {:else}
                                        <div class="space-y-3">
                                            {#each announcements as item (item.id)}
                                                <article
                                                    class="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                                                >
                                                    <div
                                                        class="flex items-center justify-between gap-3"
                                                    >
                                                        <span
                                                            class="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                        >
                                                            Aviso
                                                        </span>
                                                        <span
                                                            class="text-xs text-gray-400 dark:text-gray-500"
                                                        >
                                                            {formatNotificationDate(
                                                                item.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <p
                                                        class="mt-3 text-sm text-gray-700 dark:text-gray-100"
                                                    >
                                                        {item.message}
                                                    </p>
                                                    <div
                                                        class="mt-4 flex flex-wrap items-center gap-2 text-xs"
                                                    >
                                                        {#if getAnnouncementClientPhone(item)}
                                                            <span
                                                                class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                            >
                                                                Telefone:
                                                                {getAnnouncementClientPhone(
                                                                    item,
                                                                )}
                                                            </span>
                                                        {/if}
                                                        {#if getAnnouncementWhatsappUrl(
                                                            item,
                                                        )}
                                                            <a
                                                                href={getAnnouncementWhatsappUrl(
                                                                    item,
                                                                )}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                class="inline-flex items-center rounded-md bg-green-600 px-2.5 py-1 text-white font-medium hover:bg-green-700 transition-colors"
                                                            >
                                                                Abrir no WhatsApp
                                                            </a>
                                                        {/if}
                                                    </div>
                                                </article>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>
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
