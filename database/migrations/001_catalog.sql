-- 首个业务阶段的数据模型。SKU 单独建表，避免以后扩展变体时拆分产品实体。
CREATE TABLE staff (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL,
 totp_secret text NOT NULL, last_totp_counter bigint NOT NULL DEFAULT -1,
 permissions text[] NOT NULL, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY, staff_id uuid NOT NULL REFERENCES staff(id),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE media (
 id uuid PRIMARY KEY, file_name text NOT NULL, alt text NOT NULL,
 width integer NOT NULL, height integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE products (
 id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, name text NOT NULL, summary text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '', category text NOT NULL DEFAULT 'Balance & coordination',
 age_min integer NOT NULL DEFAULT 3 CHECK(age_min>=0), age_max integer NOT NULL DEFAULT 12 CHECK(age_max>=age_min),
 environment text NOT NULL DEFAULT 'indoor' CHECK(environment IN ('indoor','outdoor','both')),
 features jsonb NOT NULL DEFAULT '[]', specs jsonb NOT NULL DEFAULT '{}', safety_notes text NOT NULL DEFAULT '',
 image_id uuid REFERENCES media(id), status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
 seo_title text NOT NULL DEFAULT '', seo_description text NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE variants (
 id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES products(id), sku text NOT NULL UNIQUE,
 is_default boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX product_default_sku ON variants(product_id) WHERE is_default;
CREATE TABLE leads (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, idempotency_key uuid NOT NULL UNIQUE,
 payload_hash text NOT NULL, name text NOT NULL, email text NOT NULL, country text NOT NULL,
 type text NOT NULL, subject text NOT NULL, message text NOT NULL, product_id uuid REFERENCES products(id),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_progress','resolved')),
 internal_note text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE site_content (
 id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL, version integer NOT NULL DEFAULT 1
);
INSERT INTO site_content(id,data) VALUES(1,'{"hero_title":"Make room for play.","hero_subtitle":"Explore movement, balance and time together.","about":"WEMOVE SPORTS brings movement and play into everyday life. Browse the collection or contact our team with a product question.","cta_label":"Explore products"}');
CREATE TABLE audit_logs (
 id uuid PRIMARY KEY, actor uuid REFERENCES staff(id), action text NOT NULL, entity text NOT NULL,
 entity_id text NOT NULL, before_value jsonb, after_value jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX published_products ON products(status,created_at DESC);
CREATE INDEX lead_queue ON leads(status,created_at DESC);
