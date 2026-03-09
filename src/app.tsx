import { startTransition, useEffect, useMemo, useState } from "react";

import { api } from "./lib/api";
import type { AuditLog, DashboardSnapshot, InventoryPool, Reservation, Sku } from "./types";

const emptySnapshot: DashboardSnapshot = {
  vendors: [],
  products: [],
  plans: [],
  skus: [],
  inventoryPools: [],
  reservations: [],
  entitlements: [],
  auditLogs: []
};

const regions = ["GLOBAL", "US", "EU", "INDIA", "APAC"] as const;
const routes = ["/", "/catalog", "/inventory", "/reservations", "/audit"] as const;
type AppRoute = (typeof routes)[number];

const formatSkuLabel = (sku: Sku) => `${sku.code} · ${sku.region} · ${sku.billingPeriod}`;
const formatAvailable = (pool: InventoryPool) =>
  pool.totalQuantity - pool.reservedQuantity - pool.allocatedQuantity;
const getPath = (): AppRoute =>
  typeof window === "undefined" || !routes.includes(window.location.pathname as (typeof routes)[number])
    ? "/"
    : (window.location.pathname as AppRoute);

type StatusTone = "neutral" | "success" | "error";

type SubmissionContext = {
  snapshot: DashboardSnapshot;
  loading: boolean;
  reservationActor: string;
  reservationCustomerId: string;
  inventorySkuId: string;
  reservationSkuId: string;
  submit: (work: () => Promise<unknown>, message: string, reset?: () => void) => Promise<void>;
};

export function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ tone: StatusTone; text: string }>({
    tone: "neutral",
    text: "Loading inventory data."
  });
  const [route, setRoute] = useState<AppRoute>(getPath);

  const [vendorName, setVendorName] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productVendorId, setProductVendorId] = useState("");
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState<"standard" | "enterprise">("standard");
  const [planProductId, setPlanProductId] = useState("");
  const [skuCode, setSkuCode] = useState("");
  const [skuPlanId, setSkuPlanId] = useState("");
  const [skuRegion, setSkuRegion] = useState<Sku["region"]>("US");
  const [skuBillingPeriod, setSkuBillingPeriod] = useState<Sku["billingPeriod"]>("monthly");
  const [inventorySkuId, setInventorySkuId] = useState("");
  const [inventoryQuantity, setInventoryQuantity] = useState(10);
  const [adjustmentChange, setAdjustmentChange] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState<
    "MANUAL_ADD" | "MANUAL_REMOVE" | "EXTERNAL_VENDOR_SALE" | "REFUND" | "CORRECTION"
  >("MANUAL_ADD");
  const [reservationSkuId, setReservationSkuId] = useState("");
  const [reservationQuantity, setReservationQuantity] = useState(1);
  const [reservationActor, setReservationActor] = useState("operations");
  const [reservationCustomerId, setReservationCustomerId] = useState("customer-001");

  const activeReservations = snapshot.reservations.filter((item) => item.status === "RESERVED");

  const refresh = async (message = "Inventory view is up to date.") => {
    setLoading(true);

    try {
      const nextSnapshot = await api.getDashboard();
      startTransition(() => {
        setSnapshot(nextSnapshot);
        setStatusMessage({ tone: "success", text: message });
      });
    } catch (error) {
      setStatusMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to load dashboard."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const handlePopState = () => setRoute(getPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    setProductVendorId((current) => current || snapshot.vendors[0]?.id || "");
    setPlanProductId((current) => current || snapshot.products[0]?.id || "");
    setSkuPlanId((current) => current || snapshot.plans[0]?.id || "");
    setInventorySkuId((current) => current || snapshot.skus[0]?.id || "");
    setReservationSkuId((current) => current || snapshot.skus[0]?.id || "");
  }, [snapshot]);

  const navigate = (nextRoute: AppRoute) => {
    if (window.location.pathname !== nextRoute) {
      window.history.pushState({}, "", nextRoute);
    }
    setRoute(nextRoute);
  };

  const submit = async (work: () => Promise<unknown>, message: string, reset?: () => void) => {
    setLoading(true);

    try {
      await work();
      reset?.();
      await refresh(message);
    } catch (error) {
      setStatusMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Request failed."
      });
      setLoading(false);
    }
  };

  const pageTitle = useMemo(() => {
    switch (route) {
      case "/catalog":
        return { label: "catalog", title: "Catalog setup" };
      case "/inventory":
        return { label: "inventory", title: "Inventory control" };
      case "/reservations":
        return { label: "reservations", title: "Reservation desk" };
      case "/audit":
        return { label: "audit", title: "Audit history" };
      default:
        return { label: "overview", title: "Inventory overview" };
    }
  }, [route]);

  const context: SubmissionContext = {
    snapshot,
    loading,
    reservationActor,
    reservationCustomerId,
    inventorySkuId,
    reservationSkuId,
    submit
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="brand-overline">inventory</p>
          <h1>Operations</h1>
          <p className="sidebar-copy">Internal workspace for license stock, reservations, and audit review.</p>
        </div>

        <nav className="sidebar-nav" aria-label="sections">
          {[
            { label: "overview", href: "/" as AppRoute },
            { label: "catalog", href: "/catalog" as AppRoute },
            { label: "inventory", href: "/inventory" as AppRoute },
            { label: "reservations", href: "/reservations" as AppRoute },
            { label: "audit", href: "/audit" as AppRoute }
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="nav-button"
              data-active={route === item.href}
              onClick={() => navigate(item.href)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className="status-pill" data-tone={statusMessage.tone}>
            {loading ? "syncing" : "live"}
          </span>
          <p>{statusMessage.text}</p>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <p className="section-label">{pageTitle.label}</p>
            <h2>{pageTitle.title}</h2>
          </div>
          <div className="topbar-actions">
            <span className="quiet-meta">{activeReservations.length} active reservations</span>
            <button type="button" className="button-secondary" onClick={() => void refresh("Inventory view refreshed.")}>
              refresh data
            </button>
          </div>
        </header>

        <main className="content-grid">
          {route === "/" ? (
            <OverviewPage snapshot={snapshot} activeReservations={activeReservations} onNavigate={navigate} />
          ) : null}

          {route === "/catalog" ? (
            <CatalogPage
              snapshot={snapshot}
              loading={loading}
              vendorName={vendorName}
              setVendorName={setVendorName}
              productName={productName}
              setProductName={setProductName}
              productDescription={productDescription}
              setProductDescription={setProductDescription}
              productVendorId={productVendorId}
              setProductVendorId={setProductVendorId}
              planName={planName}
              setPlanName={setPlanName}
              planType={planType}
              setPlanType={setPlanType}
              planProductId={planProductId}
              setPlanProductId={setPlanProductId}
              skuCode={skuCode}
              setSkuCode={setSkuCode}
              skuPlanId={skuPlanId}
              setSkuPlanId={setSkuPlanId}
              skuRegion={skuRegion}
              setSkuRegion={setSkuRegion}
              skuBillingPeriod={skuBillingPeriod}
              setSkuBillingPeriod={setSkuBillingPeriod}
              submit={submit}
            />
          ) : null}

          {route === "/inventory" ? (
            <InventoryPage
              snapshot={snapshot}
              loading={loading}
              inventorySkuId={inventorySkuId}
              setInventorySkuId={setInventorySkuId}
              inventoryQuantity={inventoryQuantity}
              setInventoryQuantity={setInventoryQuantity}
              adjustmentChange={adjustmentChange}
              setAdjustmentChange={setAdjustmentChange}
              adjustmentReason={adjustmentReason}
              setAdjustmentReason={setAdjustmentReason}
              reservationActor={reservationActor}
              submit={submit}
            />
          ) : null}

          {route === "/reservations" ? (
            <ReservationsPage
              snapshot={snapshot}
              loading={loading}
              reservationSkuId={reservationSkuId}
              setReservationSkuId={setReservationSkuId}
              reservationQuantity={reservationQuantity}
              setReservationQuantity={setReservationQuantity}
              reservationActor={reservationActor}
              setReservationActor={setReservationActor}
              reservationCustomerId={reservationCustomerId}
              setReservationCustomerId={setReservationCustomerId}
              submit={submit}
            />
          ) : null}

          {route === "/audit" ? <AuditPage auditLogs={snapshot.auditLogs} /> : null}
        </main>
      </div>
    </div>
  );
}

function OverviewPage({
  snapshot,
  activeReservations,
  onNavigate
}: {
  snapshot: DashboardSnapshot;
  activeReservations: Reservation[];
  onNavigate: (route: AppRoute) => void;
}) {
  const latestAudit = snapshot.auditLogs.slice(0, 5);
  const lowAvailability = snapshot.inventoryPools.filter((pool) => formatAvailable(pool) <= 2).slice(0, 5);

  return (
    <>
      <section className="metrics-row" aria-label="overview metrics">
        <article className="metric-card">
          <span>vendors</span>
          <strong>{snapshot.vendors.length}</strong>
        </article>
        <article className="metric-card">
          <span>inventory pools</span>
          <strong>{snapshot.inventoryPools.length}</strong>
        </article>
        <article className="metric-card">
          <span>active reservations</span>
          <strong>{activeReservations.length}</strong>
        </article>
        <article className="metric-card">
          <span>audit events</span>
          <strong>{snapshot.auditLogs.length}</strong>
        </article>
      </section>

      <section className="overview-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Quick actions</h3>
              <p>Jump directly into the part of the workflow you need.</p>
            </div>
          </div>
          <div className="action-cluster">
            <button type="button" className="button-primary" onClick={() => onNavigate("/catalog")}>
              Open catalog setup
            </button>
            <button type="button" className="button-secondary" onClick={() => onNavigate("/inventory")}>
              Review inventory levels
            </button>
            <button type="button" className="button-secondary" onClick={() => onNavigate("/reservations")}>
              Manage reservations
            </button>
            <button type="button" className="button-secondary" onClick={() => onNavigate("/audit")}>
              Open audit history
            </button>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>Low availability</h3>
              <p>Skus with two or fewer seats left.</p>
            </div>
          </div>
          <div className="stack-list">
            {lowAvailability.length === 0 ? <EmptyState text="No low-availability pools right now." /> : null}
            {lowAvailability.map((pool) => (
              <div key={pool.id} className="list-row">
                <span>{pool.skuId}</span>
                <strong>{formatAvailable(pool)} available</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Recent audit activity</h3>
            <p>Latest inventory-affecting changes.</p>
          </div>
        </div>
        <div className="timeline">
          {latestAudit.length === 0 ? <EmptyState text="No audit events yet." /> : null}
          {latestAudit.map((entry) => (
            <article key={entry.id} className="timeline-row">
              <span>{entry.action}</span>
              <span>{entry.actor}</span>
              <time>{new Date(entry.timestamp).toLocaleString()}</time>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function CatalogPage(props: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  vendorName: string;
  setVendorName: (value: string) => void;
  productName: string;
  setProductName: (value: string) => void;
  productDescription: string;
  setProductDescription: (value: string) => void;
  productVendorId: string;
  setProductVendorId: (value: string) => void;
  planName: string;
  setPlanName: (value: string) => void;
  planType: "standard" | "enterprise";
  setPlanType: (value: "standard" | "enterprise") => void;
  planProductId: string;
  setPlanProductId: (value: string) => void;
  skuCode: string;
  setSkuCode: (value: string) => void;
  skuPlanId: string;
  setSkuPlanId: (value: string) => void;
  skuRegion: Sku["region"];
  setSkuRegion: (value: Sku["region"]) => void;
  skuBillingPeriod: Sku["billingPeriod"];
  setSkuBillingPeriod: (value: Sku["billingPeriod"]) => void;
  submit: SubmissionContext["submit"];
}) {
  const {
    snapshot,
    loading,
    vendorName,
    setVendorName,
    productName,
    setProductName,
    productDescription,
    setProductDescription,
    productVendorId,
    setProductVendorId,
    planName,
    setPlanName,
    planType,
    setPlanType,
    planProductId,
    setPlanProductId,
    skuCode,
    setSkuCode,
    skuPlanId,
    setSkuPlanId,
    skuRegion,
    setSkuRegion,
    skuBillingPeriod,
    setSkuBillingPeriod,
    submit
  } = props;

  return (
    <section className="page-grid">
      <CardSection title="Create vendor" description="Start by adding a software vendor.">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(() => api.createVendor({ name: vendorName }), "Vendor created.", () => setVendorName(""));
          }}
        >
          <label className="full-span">
            vendor name
            <input value={vendorName} onChange={(event) => setVendorName(event.target.value)} placeholder="Atlassian" />
          </label>
          <div className="action-bar">
            <button type="submit" className="button-primary" disabled={!vendorName || loading}>
              Create vendor
            </button>
          </div>
        </form>
      </CardSection>

      <CardSection title="Create product" description="Attach a product to an existing vendor.">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(
              () =>
                api.createProduct({
                  vendorId: productVendorId,
                  name: productName,
                  description: productDescription
                }),
              "Product created.",
              () => {
                setProductName("");
                setProductDescription("");
              }
            );
          }}
        >
          <label>
            vendor
            <select value={productVendorId} onChange={(event) => setProductVendorId(event.target.value)}>
              {snapshot.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            product name
            <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Jira" />
          </label>
          <label className="full-span">
            description
            <input
              value={productDescription}
              onChange={(event) => setProductDescription(event.target.value)}
              placeholder="Short operational description"
            />
          </label>
          <div className="action-bar">
            <button type="submit" className="button-primary" disabled={!productVendorId || !productName || loading}>
              Create product
            </button>
          </div>
        </form>
      </CardSection>

      <CardSection title="Create plan" description="Define the commercial plan under a product.">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(
              () => api.createPlan({ productId: planProductId, name: planName, planType }),
              "Plan created.",
              () => setPlanName("")
            );
          }}
        >
          <label>
            product
            <select value={planProductId} onChange={(event) => setPlanProductId(event.target.value)}>
              {snapshot.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            plan name
            <input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="Standard" />
          </label>
          <label className="full-span">
            plan type
            <select value={planType} onChange={(event) => setPlanType(event.target.value as typeof planType)}>
              <option value="standard">standard</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>
          <div className="action-bar">
            <button type="submit" className="button-primary" disabled={!planProductId || !planName || loading}>
              Create plan
            </button>
          </div>
        </form>
      </CardSection>

      <CardSection title="Create sku" description="Create the sellable sku used for inventory and reservations.">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(
              () =>
                api.createSku({
                  planId: skuPlanId,
                  code: skuCode,
                  billingPeriod: skuBillingPeriod,
                  region: skuRegion,
                  seatType: "seat"
                }),
              "Sku created.",
              () => setSkuCode("")
            );
          }}
        >
          <label>
            plan
            <select value={skuPlanId} onChange={(event) => setSkuPlanId(event.target.value)}>
              {snapshot.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            sku code
            <input
              value={skuCode}
              onChange={(event) => setSkuCode(event.target.value)}
              placeholder="jira-standard-monthly-us"
            />
          </label>
          <label>
            region
            <select value={skuRegion} onChange={(event) => setSkuRegion(event.target.value as Sku["region"])}>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>
          <label>
            billing period
            <select
              value={skuBillingPeriod}
              onChange={(event) => setSkuBillingPeriod(event.target.value as Sku["billingPeriod"])}
            >
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
            </select>
          </label>
          <div className="action-bar">
            <button type="submit" className="button-primary" disabled={!skuPlanId || !skuCode || loading}>
              Create sku
            </button>
          </div>
        </form>
      </CardSection>
    </section>
  );
}

function InventoryPage(props: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  inventorySkuId: string;
  setInventorySkuId: (value: string) => void;
  inventoryQuantity: number;
  setInventoryQuantity: (value: number) => void;
  adjustmentChange: number;
  setAdjustmentChange: (value: number) => void;
  adjustmentReason: "MANUAL_ADD" | "MANUAL_REMOVE" | "EXTERNAL_VENDOR_SALE" | "REFUND" | "CORRECTION";
  setAdjustmentReason: (
    value: "MANUAL_ADD" | "MANUAL_REMOVE" | "EXTERNAL_VENDOR_SALE" | "REFUND" | "CORRECTION"
  ) => void;
  reservationActor: string;
  submit: SubmissionContext["submit"];
}) {
  const {
    snapshot,
    loading,
    inventorySkuId,
    setInventorySkuId,
    inventoryQuantity,
    setInventoryQuantity,
    adjustmentChange,
    setAdjustmentChange,
    adjustmentReason,
    setAdjustmentReason,
    reservationActor,
    submit
  } = props;

  return (
    <>
      <section className="page-grid">
        <CardSection title="Create inventory pool" description="Create a tracked pool for an existing sku.">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const sku = snapshot.skus.find((item) => item.id === inventorySkuId);

              void submit(
                () =>
                  api.createInventoryPool({
                    skuId: inventorySkuId,
                    region: sku?.region ?? "US",
                    totalQuantity: inventoryQuantity
                  }),
                "Inventory pool created."
              );
            }}
          >
            <label className="full-span">
              sku
              <select value={inventorySkuId} onChange={(event) => setInventorySkuId(event.target.value)}>
                {snapshot.skus.map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {formatSkuLabel(sku)}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-span">
              total quantity
              <input
                type="number"
                min={1}
                value={inventoryQuantity}
                onChange={(event) => setInventoryQuantity(Number(event.target.value))}
              />
            </label>
            <div className="action-bar">
              <button type="submit" className="button-primary" disabled={!inventorySkuId || loading}>
                Create inventory pool
              </button>
            </div>
          </form>
        </CardSection>

        <CardSection title="Adjust inventory" description="Apply manual changes, vendor-side sales, refunds, or corrections.">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const sku = snapshot.skus.find((item) => item.id === inventorySkuId);

              void submit(
                () =>
                  api.adjustInventory({
                    skuId: inventorySkuId,
                    region: sku?.region ?? "US",
                    change: adjustmentReason === "MANUAL_REMOVE" ? -Math.abs(adjustmentChange) : adjustmentChange,
                    reason: adjustmentReason,
                    actor: reservationActor
                  }),
                "Inventory adjusted."
              );
            }}
          >
            <label>
              adjustment amount
              <input
                type="number"
                value={adjustmentChange}
                onChange={(event) => setAdjustmentChange(Number(event.target.value))}
              />
            </label>
            <label>
              adjustment reason
              <select
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value as typeof adjustmentReason)}
              >
                <option value="MANUAL_ADD">manual add</option>
                <option value="MANUAL_REMOVE">manual remove</option>
                <option value="EXTERNAL_VENDOR_SALE">vendor sale</option>
                <option value="REFUND">refund</option>
                <option value="CORRECTION">correction</option>
              </select>
            </label>
            <div className="action-bar">
              <button type="submit" className="button-primary" disabled={!inventorySkuId || loading}>
                Apply inventory adjustment
              </button>
            </div>
          </form>
        </CardSection>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Inventory table</h3>
            <p>Current total, reserved, allocated, and available quantities.</p>
          </div>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>sku</th>
                <th>total</th>
                <th>reserved</th>
                <th>allocated</th>
                <th>available</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.inventoryPools.map((pool) => {
                const sku = snapshot.skus.find((item) => item.id === pool.skuId);
                return (
                  <tr key={pool.id}>
                    <td>{sku ? formatSkuLabel(sku) : pool.skuId}</td>
                    <td>{pool.totalQuantity}</td>
                    <td>{pool.reservedQuantity}</td>
                    <td>{pool.allocatedQuantity}</td>
                    <td>{formatAvailable(pool)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ReservationsPage(props: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  reservationSkuId: string;
  setReservationSkuId: (value: string) => void;
  reservationQuantity: number;
  setReservationQuantity: (value: number) => void;
  reservationActor: string;
  setReservationActor: (value: string) => void;
  reservationCustomerId: string;
  setReservationCustomerId: (value: string) => void;
  submit: SubmissionContext["submit"];
}) {
  const {
    snapshot,
    loading,
    reservationSkuId,
    setReservationSkuId,
    reservationQuantity,
    setReservationQuantity,
    reservationActor,
    setReservationActor,
    reservationCustomerId,
    setReservationCustomerId,
    submit
  } = props;

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Create reservation</h3>
            <p>Create a temporary hold before final allocation.</p>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const sku = snapshot.skus.find((item) => item.id === reservationSkuId);

            void submit(
              () =>
                api.createReservation({
                  skuId: reservationSkuId,
                  region: sku?.region ?? "US",
                  quantity: reservationQuantity,
                  actor: reservationActor
                }),
              "Reservation created."
            );
          }}
        >
          <label className="full-span">
            sku
            <select value={reservationSkuId} onChange={(event) => setReservationSkuId(event.target.value)}>
              {snapshot.skus.map((sku) => (
                <option key={sku.id} value={sku.id}>
                  {formatSkuLabel(sku)}
                </option>
              ))}
            </select>
          </label>
          <label>
            quantity
            <input
              type="number"
              min={1}
              value={reservationQuantity}
              onChange={(event) => setReservationQuantity(Number(event.target.value))}
            />
          </label>
          <label>
            operator id
            <input value={reservationActor} onChange={(event) => setReservationActor(event.target.value)} />
          </label>
          <label>
            customer id
            <input value={reservationCustomerId} onChange={(event) => setReservationCustomerId(event.target.value)} />
          </label>
          <div className="action-bar">
            <button type="submit" className="button-primary" disabled={!reservationSkuId || loading}>
              Create reservation
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => void submit(() => api.processExpiredReservations(), "Expiry sweep completed.")}
            >
              Run expiry sweep
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Reservation queue</h3>
            <p>Confirm reservations once a deal closes, or cancel them to release stock.</p>
          </div>
        </div>
        <div className="reservation-stack">
          {snapshot.reservations.length === 0 ? <EmptyState text="No reservations yet." /> : null}
          {snapshot.reservations.map((reservation: Reservation) => {
            const sku = snapshot.skus.find((item) => item.id === reservation.skuId);

            return (
              <article key={reservation.id} className="reservation-row">
                <div>
                  <p className="reservation-title">{sku ? formatSkuLabel(sku) : reservation.skuId}</p>
                  <p className="reservation-meta">
                    {reservation.quantity} seats · {reservation.status.toLowerCase()} · expires{" "}
                    {new Date(reservation.expiresAt).toLocaleString()}
                  </p>
                </div>
                <div className="action-row">
                  <button
                    type="button"
                    className="button-primary"
                    disabled={reservation.status !== "RESERVED" || loading}
                    onClick={() =>
                      void submit(
                        () =>
                          api.confirmReservation(reservation.id, {
                            customerId: reservationCustomerId,
                            actor: reservationActor
                          }),
                        "Reservation confirmed."
                      )
                    }
                  >
                    Confirm reservation
                  </button>
                  <button
                    type="button"
                    className="button-danger"
                    disabled={reservation.status !== "RESERVED" || loading}
                    onClick={() =>
                      void submit(
                        () => api.cancelReservation(reservation.id, { actor: reservationActor }),
                        "Reservation cancelled."
                      )
                    }
                  >
                    Cancel reservation
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function AuditPage({ auditLogs }: { auditLogs: AuditLog[] }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>Audit log</h3>
          <p>Recent inventory mutations and operators.</p>
        </div>
      </div>
      <div className="timeline">
        {auditLogs.length === 0 ? <EmptyState text="No audit events yet." /> : null}
        {auditLogs.map((entry) => (
          <article key={entry.id} className="timeline-row">
            <span>{entry.action}</span>
            <span>{entry.actor}</span>
            <time>{new Date(entry.timestamp).toLocaleString()}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

function CardSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
