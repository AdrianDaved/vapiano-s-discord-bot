--
-- PostgreSQL database dump
--

\restrict PaPfWGvscQYgo10tE5siF9nXzPHlKMpiUcPwJc9yhfNcY6EsSuBvkgBfqWYKPU4

-- Dumped from database version 16.13 (Homebrew)
-- Dumped by pg_dump version 16.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: afk_statuses; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.afk_statuses (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "userId" text NOT NULL,
    reason text DEFAULT 'AFK'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.afk_statuses OWNER TO vapiano;

--
-- Name: auto_responses; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.auto_responses (
    id text NOT NULL,
    "guildId" text NOT NULL,
    trigger text NOT NULL,
    response text NOT NULL,
    "matchType" text DEFAULT 'contains'::text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.auto_responses OWNER TO vapiano;

--
-- Name: backups; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.backups (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "creatorId" text NOT NULL,
    name text NOT NULL,
    data jsonb NOT NULL,
    size integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.backups OWNER TO vapiano;

--
-- Name: giveaways; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.giveaways (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "channelId" text NOT NULL,
    "messageId" text,
    "hostId" text NOT NULL,
    prize text NOT NULL,
    description text,
    winners integer DEFAULT 1 NOT NULL,
    entries text[] DEFAULT ARRAY[]::text[],
    "winnerIds" text[] DEFAULT ARRAY[]::text[],
    "endsAt" timestamp(3) without time zone NOT NULL,
    ended boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.giveaways OWNER TO vapiano;

--
-- Name: guild_configs; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.guild_configs (
    id text NOT NULL,
    prefix text DEFAULT '!'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "invitesEnabled" boolean DEFAULT false NOT NULL,
    "moderationEnabled" boolean DEFAULT false NOT NULL,
    "automodEnabled" boolean DEFAULT false NOT NULL,
    "ticketsEnabled" boolean DEFAULT false NOT NULL,
    "automationEnabled" boolean DEFAULT false NOT NULL,
    "welcomeEnabled" boolean DEFAULT false NOT NULL,
    "farewellEnabled" boolean DEFAULT false NOT NULL,
    "welcomeChannelId" text,
    "welcomeMessage" text DEFAULT 'Bienvenido {user} !'::text,
    "welcomeImageEnabled" boolean DEFAULT false NOT NULL,
    "farewellChannelId" text,
    "farewellMessage" text DEFAULT 'Goodbye {user}, we''ll miss you!'::text,
    "modLogChannelId" text,
    "messageLogChannelId" text,
    "joinLeaveLogChannelId" text,
    "muteRoleId" text,
    "ticketCategoryId" text,
    "ticketLogChannelId" text,
    "ticketStaffRoleIds" text[] DEFAULT ARRAY[]::text[],
    "ticketCounter" integer DEFAULT 0 NOT NULL,
    "joinRoleIds" text[] DEFAULT ARRAY[]::text[],
    "antiSpamEnabled" boolean DEFAULT false NOT NULL,
    "antiSpamThreshold" integer DEFAULT 5 NOT NULL,
    "antiSpamInterval" integer DEFAULT 5 NOT NULL,
    "antiFloodEnabled" boolean DEFAULT false NOT NULL,
    "antiCapsEnabled" boolean DEFAULT false NOT NULL,
    "antiCapsThreshold" integer DEFAULT 70 NOT NULL,
    "antiLinksEnabled" boolean DEFAULT false NOT NULL,
    "antiLinksWhitelist" text[] DEFAULT ARRAY[]::text[],
    "blacklistedWords" text[] DEFAULT ARRAY[]::text[],
    "automodExemptRoleIds" text[] DEFAULT ARRAY[]::text[],
    "automodExemptChannelIds" text[] DEFAULT ARRAY[]::text[],
    "giveawayEnabled" boolean DEFAULT false NOT NULL,
    "repChannelId" text,
    "repCooldown" integer DEFAULT 86400 NOT NULL,
    "reputationEnabled" boolean DEFAULT false NOT NULL,
    "starboardChannelId" text,
    "starboardEmoji" text DEFAULT '⭐'::text NOT NULL,
    "starboardEnabled" boolean DEFAULT false NOT NULL,
    "starboardThreshold" integer DEFAULT 3 NOT NULL,
    "suggestionsChannelId" text,
    "suggestionsEnabled" boolean DEFAULT false NOT NULL,
    "suggestionsLogChannelId" text,
    "ticketCloseConfirmation" boolean DEFAULT true NOT NULL,
    "ticketDMTranscript" boolean DEFAULT true NOT NULL,
    "ticketTranscriptChannelId" text,
    "afkEnabled" boolean DEFAULT true NOT NULL,
    "backupEnabled" boolean DEFAULT true NOT NULL,
    "loggingEnabled" boolean DEFAULT false NOT NULL,
    "stickyEnabled" boolean DEFAULT true NOT NULL,
    "auditLogChannelId" text,
    "voiceLogChannelId" text,
    "antiCapsMinLength" integer DEFAULT 10 NOT NULL,
    "blacklistEnabled" boolean DEFAULT false NOT NULL,
    "moduleAllowedRoles" jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.guild_configs OWNER TO vapiano;

--
-- Name: invites; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.invites (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "inviterId" text NOT NULL,
    "invitedId" text NOT NULL,
    code text NOT NULL,
    fake boolean DEFAULT false NOT NULL,
    "left" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.invites OWNER TO vapiano;

--
-- Name: mod_actions; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.mod_actions (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "userId" text NOT NULL,
    "moderatorId" text NOT NULL,
    action text NOT NULL,
    reason text DEFAULT 'No reason provided'::text NOT NULL,
    duration integer,
    "expiresAt" timestamp(3) without time zone,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.mod_actions OWNER TO vapiano;

--
-- Name: polls; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.polls (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "channelId" text NOT NULL,
    "messageId" text,
    question text NOT NULL,
    options text[],
    votes jsonb DEFAULT '{}'::jsonb NOT NULL,
    "creatorId" text NOT NULL,
    "endsAt" timestamp(3) without time zone,
    ended boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.polls OWNER TO vapiano;

--
-- Name: reaction_roles; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.reaction_roles (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "channelId" text NOT NULL,
    "messageId" text NOT NULL,
    emoji text NOT NULL,
    "roleId" text NOT NULL,
    type text DEFAULT 'toggle'::text NOT NULL
);


ALTER TABLE public.reaction_roles OWNER TO vapiano;

--
-- Name: reminders; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.reminders (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "userId" text NOT NULL,
    "channelId" text NOT NULL,
    message text NOT NULL,
    "remindAt" timestamp(3) without time zone NOT NULL,
    fired boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reminders OWNER TO vapiano;

--
-- Name: reputations; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.reputations (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "userId" text NOT NULL,
    "giverId" text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reputations OWNER TO vapiano;

--
-- Name: scheduled_messages; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.scheduled_messages (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "channelId" text NOT NULL,
    message text NOT NULL,
    cron text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "lastRun" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.scheduled_messages OWNER TO vapiano;

--
-- Name: starboard_entries; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.starboard_entries (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "originalMsgId" text NOT NULL,
    "originalChId" text NOT NULL,
    "starboardMsgId" text,
    "authorId" text NOT NULL,
    stars integer DEFAULT 0 NOT NULL,
    content text,
    "attachmentUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.starboard_entries OWNER TO vapiano;

--
-- Name: sticky_messages; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.sticky_messages (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "channelId" text NOT NULL,
    "messageId" text,
    title text,
    description text NOT NULL,
    color text DEFAULT '#5865F2'::text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sticky_messages OWNER TO vapiano;

--
-- Name: suggestions; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.suggestions (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "channelId" text NOT NULL,
    "messageId" text,
    "userId" text NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    upvotes text[] DEFAULT ARRAY[]::text[],
    downvotes text[] DEFAULT ARRAY[]::text[],
    "staffNote" text,
    "reviewedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.suggestions OWNER TO vapiano;

--
-- Name: ticket_panels; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.ticket_panels (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "channelId" text NOT NULL,
    "messageId" text,
    title text DEFAULT 'Support Tickets'::text NOT NULL,
    description text DEFAULT 'Click the button below to create a ticket.'::text NOT NULL,
    "buttonLabel" text DEFAULT 'Create Ticket'::text NOT NULL,
    "buttonEmoji" text DEFAULT '🎫'::text,
    "categoryId" text,
    "staffRoleIds" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "adminRoleIds" text[] DEFAULT ARRAY[]::text[],
    "buttonColor" text DEFAULT 'Primary'::text NOT NULL,
    "claimEnabled" boolean DEFAULT true NOT NULL,
    "claimLockOthers" boolean DEFAULT false NOT NULL,
    "closeRequestEnabled" boolean DEFAULT true NOT NULL,
    "closeRequestMessage" text DEFAULT 'Are you sure you want to close this ticket?'::text,
    "closedCategoryId" text,
    "embedColor" text DEFAULT '#5865F2'::text NOT NULL,
    "escalatePanelId" text,
    "feedbackEnabled" boolean DEFAULT false NOT NULL,
    "feedbackMessage" text DEFAULT 'How would you rate the support you received?'::text,
    "footerText" text,
    "formEnabled" boolean DEFAULT false NOT NULL,
    "formQuestions" jsonb,
    "formTitle" text DEFAULT 'Ticket Form'::text,
    "logChannelId" text,
    "mentionCreator" boolean DEFAULT true NOT NULL,
    "mentionStaff" boolean DEFAULT true NOT NULL,
    name text DEFAULT 'Default'::text NOT NULL,
    "namingPattern" text DEFAULT 'ticket-{number}'::text NOT NULL,
    "showClaimButton" boolean DEFAULT true NOT NULL,
    "showCloseButton" boolean DEFAULT true NOT NULL,
    "showTranscriptButton" boolean DEFAULT true NOT NULL,
    style text DEFAULT 'button'::text NOT NULL,
    "ticketLimit" integer DEFAULT 1 NOT NULL,
    "transcriptChannelId" text,
    "transcriptDMStaff" boolean DEFAULT false NOT NULL,
    "transcriptDMUser" boolean DEFAULT true NOT NULL,
    "transcriptEnabled" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "welcomeColor" text DEFAULT '#5865F2'::text NOT NULL,
    "welcomeMessage" text DEFAULT 'Welcome! Please describe your issue.
A staff member will assist you shortly.'::text,
    "welcomeTitle" text DEFAULT 'Ticket Opened'::text,
    "autoCloseHours" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.ticket_panels OWNER TO vapiano;

--
-- Name: ticket_transcripts; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.ticket_transcripts (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "panelId" text,
    "guildId" text NOT NULL,
    "channelId" text NOT NULL,
    "userId" text NOT NULL,
    "closedBy" text,
    "messageCount" integer DEFAULT 0 NOT NULL,
    messages jsonb NOT NULL,
    "htmlContent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ticket_transcripts OWNER TO vapiano;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.tickets (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "panelId" text,
    "channelId" text NOT NULL,
    "userId" text NOT NULL,
    number integer NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    topic text,
    "claimedBy" text,
    "closedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "addedUsers" text[] DEFAULT ARRAY[]::text[],
    "closeReason" text,
    "closedBy" text,
    feedback text,
    "firstResponse" timestamp(3) without time zone,
    priority text DEFAULT 'normal'::text NOT NULL,
    rating integer,
    "lastActivityAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reminderAt" timestamp(3) without time zone,
    "reminderFired" boolean DEFAULT false NOT NULL,
    "reminderRoleIds" text[] DEFAULT ARRAY[]::text[],
    "reminderMessageId" text
);


ALTER TABLE public.tickets OWNER TO vapiano;

--
-- Name: warnings; Type: TABLE; Schema: public; Owner: vapiano
--

CREATE TABLE public.warnings (
    id text NOT NULL,
    "guildId" text NOT NULL,
    "userId" text NOT NULL,
    "moderatorId" text NOT NULL,
    reason text DEFAULT 'No reason provided'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.warnings OWNER TO vapiano;

--
-- Data for Name: afk_statuses; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.afk_statuses (id, "guildId", "userId", reason, "createdAt") FROM stdin;
\.


--
-- Data for Name: auto_responses; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.auto_responses (id, "guildId", trigger, response, "matchType", enabled, "createdAt") FROM stdin;
\.


--
-- Data for Name: backups; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.backups (id, "guildId", "creatorId", name, data, size, "createdAt") FROM stdin;
862e0e6c-1ed4-4e42-a960-9717bb146c69	1420045220325625898	1438361558475608148	Vapianos	{"icon": "https://cdn.discordapp.com/icons/1420045220325625898/a_c8798492d29118df8e37ed023b54c830.gif?size=1024", "name": "Vapiano's | GTAHUB.GG", "roles": [{"name": "**", "color": "#000000", "hoist": false, "position": 23, "mentionable": false, "permissions": "8"}, {"name": "Vapiano", "color": "#369876", "hoist": true, "position": 22, "mentionable": false, "permissions": "1721826619162615"}, {"name": "Bot", "color": "#000000", "hoist": false, "position": 21, "mentionable": false, "permissions": "8"}, {"name": "Owner", "color": "#ff4949", "hoist": true, "position": 20, "mentionable": false, "permissions": "8"}, {"name": "Moderador", "color": "#0073ff", "hoist": true, "position": 19, "mentionable": false, "permissions": "8"}, {"name": "Mediador", "color": "#faf1b3", "hoist": true, "position": 17, "mentionable": false, "permissions": "8"}, {"name": "Hijo de Vapiano", "color": "#000000", "hoist": false, "position": 16, "mentionable": false, "permissions": "0"}, {"name": "Member OOC", "color": "#00e5ff", "hoist": true, "position": 14, "mentionable": false, "permissions": "0"}, {"name": "Member Verificado", "color": "#4800ff", "hoist": true, "position": 13, "mentionable": false, "permissions": "110363583827521"}, {"name": "Verificacion+", "color": "#000000", "hoist": false, "position": 12, "mentionable": false, "permissions": "0"}, {"name": "BOTS", "color": "#8799ae", "hoist": true, "position": 11, "mentionable": false, "permissions": "8"}, {"name": "Member", "color": "#95a5a6", "hoist": false, "position": 10, "mentionable": false, "permissions": "66561"}, {"name": "Vendedor Certificado | Vapiano's Store", "color": "#000000", "hoist": false, "position": 4, "mentionable": false, "permissions": "0"}], "afkTimeout": 300, "categories": [{"name": "Tickets De Venta", "position": 0, "permissionOverwrites": []}, {"name": "Tickets Transcripción", "position": 1, "permissionOverwrites": []}, {"name": "Tickets Mediación", "position": 2, "permissionOverwrites": []}, {"name": "Tickets Soporte", "position": 3, "permissionOverwrites": []}, {"name": "Tickets Verificación OOC", "position": 4, "permissionOverwrites": []}, {"name": "Tickets Estafas", "position": 5, "permissionOverwrites": []}, {"name": "INFORMACION", "position": 6, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "412317124672", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "SOCIAL", "position": 7, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "1024", "type": 0, "allow": "1048576", "roleName": "Member"}]}, {"name": "LEGAL", "position": 8, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "ILEGAL", "position": 9, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}]}, {"name": "VENTA X OOC", "position": 10, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "3072", "roleName": "Member OOC"}, {"deny": "109951211018752", "type": 0, "allow": "1115136", "roleName": "Member Verificado"}]}, {"name": "VENTAS POR ENCARGO", "position": 11, "permissionOverwrites": [{"deny": "1024", "type": 0, "allow": "1048576", "roleName": "Member Verificado"}]}, {"name": "STAFF", "position": 12, "permissionOverwrites": []}, {"name": "Tickets Cerrados", "position": 13, "permissionOverwrites": []}, {"name": "Registro De Verificados", "position": 14, "permissionOverwrites": []}], "afkChannelId": null, "textChannels": [{"name": "closed-0001", "nsfw": false, "type": 0, "topic": "Ticket by nooghv._. | ID: 1", "position": 0, "parentName": null, "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "68624", "roleName": null}, {"deny": "3072", "type": 1, "allow": "98304", "roleName": null}]}, {"name": "closed-0047", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "millones-pendientes", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "Tickets Mediación", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "🛍️│𝐑𝐨𝐩𝐚-𝐎𝐛𝐣𝐞𝐭𝐨𝐬", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "VENTAS POR ENCARGO", "rateLimitPerUser": 0, "permissionOverwrites": []}, {"name": "🔫│𝐀𝐫𝐦𝐚𝐬", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "ILEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}]}, {"name": "𝗔𝗻𝘂𝗻𝗰𝗶𝗼𝘀", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "STAFF", "rateLimitPerUser": 0, "permissionOverwrites": []}, {"name": "𝐇𝐮𝐛𝐬𝐭𝐨𝐫𝐞-𝐱-𝐕𝐚𝐩𝐢𝐚𝐧𝐨", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "INFORMACION", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "2048", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "412317124672", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "registros", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "Tickets Transcripción", "rateLimitPerUser": 0, "permissionOverwrites": []}, {"name": "closed-0004", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "Tickets Estafas", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "👕│𝐑𝐨𝐩𝐚-𝐇𝐨𝐦𝐛𝐫𝐞", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "LEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "armascargas-leonsantos77", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "Tickets De Venta", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "363584", "roleName": null}, {"deny": "0", "type": 0, "allow": "371776", "roleName": "Vendedor Certificado | Vapiano's Store"}]}, {"name": "❗│𝐕𝐞𝐫𝐢𝐟𝐢𝐜𝐚𝐜𝐢𝐨𝐧", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "VENTA X OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "1024", "type": 0, "allow": "0", "roleName": "Member OOC"}, {"deny": "2048", "type": 0, "allow": "1024", "roleName": "Member Verificado"}]}, {"name": "ticket-0049", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "soporte-krotaso", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "Tickets Soporte", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "371776", "roleName": "Mediador"}, {"deny": "0", "type": 0, "allow": "371776", "roleName": "Moderador"}, {"deny": "0", "type": 0, "allow": "371776", "roleName": "Owner"}, {"deny": "0", "type": 1, "allow": "363584", "roleName": null}]}, {"name": "💬│𝐆𝐞𝐧𝐞𝐫𝐚𝐥", "nsfw": false, "type": 0, "topic": null, "position": 0, "parentName": "SOCIAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "137440265280", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "ticket-0006", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "Tickets Estafas", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0002", "nsfw": false, "type": 0, "topic": "Ticket by adriandave_ | ID: 2", "position": 1, "parentName": null, "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "68624", "roleName": null}, {"deny": "3072", "type": 1, "allow": "98304", "roleName": null}]}, {"name": "𝗔𝘂𝗱𝗶𝘁𝗼𝗿𝗶𝗮", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "STAFF", "rateLimitPerUser": 0, "permissionOverwrites": []}, {"name": "closed-0005", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "Tickets Soporte", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "👚│𝐑𝐨𝐩𝐚-𝐌𝐮𝐣𝐞𝐫", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "LEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "🤝│𝐁𝐢𝐞𝐧𝐯𝐞𝐧𝐢𝐝𝐚", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "INFORMACION", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1024", "roleName": "Member Verificado"}]}, {"name": "closed-0068", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "🔫│𝐀𝐫𝐦𝐚𝐬-𝐂𝐚𝐫𝐠𝐚𝐬", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "VENTAS POR ENCARGO", "rateLimitPerUser": 0, "permissionOverwrites": []}, {"name": "💵│𝐃𝐢𝐧𝐞𝐫𝐨-𝐈𝐂", "nsfw": false, "type": 0, "topic": "", "position": 1, "parentName": "VENTA X OOC", "rateLimitPerUser": 3600, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "3072", "roleName": "Member OOC"}, {"deny": "2048", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}]}, {"name": "armascargas-josee_fddezzz", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "Tickets De Venta", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "1024", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 0, "allow": "371776", "roleName": "Vendedor Certificado | Vapiano's Store"}]}, {"name": "ticket-0017", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "Tickets Mediación", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "ticket-0050", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "💊│𝐃𝐫𝐨𝐠𝐚𝐬-𝐏𝐥𝐚𝐧𝐨𝐬", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "ILEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}]}, {"name": "🎥│𝐌𝐮𝐥𝐭𝐢𝐦𝐞𝐝𝐢𝐚", "nsfw": false, "type": 0, "topic": null, "position": 1, "parentName": "SOCIAL", "rateLimitPerUser": 3600, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "💎│𝐇𝐮𝐛-𝐂𝐨𝐢𝐧𝐬", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "VENTA X OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "3072", "roleName": "Member OOC"}, {"deny": "2048", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}]}, {"name": "🏃🏼│𝐎𝐫𝐠𝐚𝐧𝐢𝐳𝐚𝐜𝐢𝐨𝐧𝐞𝐬", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "ILEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}]}, {"name": "armascargas-djmalec", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "Tickets De Venta", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "371776", "roleName": "Vendedor Certificado | Vapiano's Store"}]}, {"name": "ticket-0055", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "3072", "roleName": null}]}, {"name": "🛍️│𝐎𝐛𝐣𝐞𝐭𝐨𝐬", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "LEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "ticket-0005", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "Tickets Estafas", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "𝗣𝗿𝗶𝘃𝗮𝗱𝗼", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "STAFF", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "1024", "roleName": null}, {"deny": "0", "type": 0, "allow": "0", "roleName": "Owner"}]}, {"name": "closed-0069", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "ticket-0005", "nsfw": false, "type": 0, "topic": "Ticket #5 | Created by nooghv._. | Panel: a", "position": 2, "parentName": null, "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "117760", "roleName": null}, {"deny": "0", "type": 1, "allow": "76816", "roleName": null}]}, {"name": "🛫│𝐃𝐞𝐬𝐩𝐞𝐝𝐢𝐝𝐚𝐬", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "INFORMACION", "rateLimitPerUser": 0, "permissionOverwrites": []}, {"name": "closed-0018", "nsfw": false, "type": 0, "topic": null, "position": 2, "parentName": "Tickets Mediación", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "𝗣𝗮𝗴𝗼𝘀-𝗣𝗮𝘆𝗽𝗮𝗹", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "STAFF", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "1024", "type": 0, "allow": "0", "roleName": "Member Verificado"}]}, {"name": "closed-0070", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "🛒│𝐈𝐭𝐞𝐦𝐬-𝐗-𝐎𝐎𝐂", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "VENTA X OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "3072", "roleName": "Member OOC"}, {"deny": "2048", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}]}, {"name": "✅│𝐕𝐞𝐫𝐢𝐟𝐢𝐜𝐚𝐜𝐢𝐨𝐧", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "INFORMACION", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "1024", "type": 0, "allow": "0", "roleName": "Member Verificado"}, {"deny": "1024", "type": 0, "allow": "0", "roleName": "Member"}]}, {"name": "closed-0001", "nsfw": false, "type": 0, "topic": "Ticket #1 | Created by nooghv._. | Panel: gola", "position": 3, "parentName": null, "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "76816", "roleName": null}, {"deny": "3072", "type": 1, "allow": "114688", "roleName": null}]}, {"name": "ropaobjetos-lucasfar", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "Tickets De Venta", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "363584", "roleName": null}, {"deny": "0", "type": 0, "allow": "371776", "roleName": "Vendedor Certificado | Vapiano's Store"}]}, {"name": "👥│𝐑𝐞𝐜𝐥𝐮𝐭𝐚𝐦𝐢𝐞𝐧𝐭𝐨𝐬", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "ILEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}]}, {"name": "ticket-0057", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "3072", "roleName": null}]}, {"name": "🤢│𝐄𝐬𝐭𝐚𝐟𝐚𝐬", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "SOCIAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "🏠│𝐏𝐫𝐨𝐩𝐢𝐞𝐝𝐚𝐝𝐞𝐬", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "LEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "ticket-0007", "nsfw": false, "type": 0, "topic": null, "position": 3, "parentName": "Tickets Estafas", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "3072", "roleName": null}]}, {"name": "closed-0040", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "𝗘𝗻𝗰𝗮𝗿𝗴𝗼𝘀", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "STAFF", "rateLimitPerUser": 0, "permissionOverwrites": []}, {"name": "armascargas-__fz__", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "Tickets De Venta", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "363584", "roleName": null}, {"deny": "0", "type": 0, "allow": "371776", "roleName": "Vendedor Certificado | Vapiano's Store"}]}, {"name": "ticket-0008", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "Tickets Estafas", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "🔴│𝐂𝐡𝐞𝐚𝐭𝐬", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "VENTA X OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "3072", "roleName": "Member OOC"}, {"deny": "109951211018752", "type": 0, "allow": "1115136", "roleName": "Member Verificado"}]}, {"name": "🧪│𝐎𝐛𝐣𝐞𝐭𝐨𝐬", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "ILEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "1024", "type": 0, "allow": "1048576", "roleName": "Member"}]}, {"name": "🏦│𝐎𝐫𝐠𝐚𝐧𝐢𝐳𝐚𝐜𝐢𝐨𝐧𝐞𝐬", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "LEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "ticket-0059", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "📜│𝐑𝐞𝐠𝐥𝐚𝐬", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "INFORMACION", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "377957124160", "type": 0, "allow": "1", "roleName": "Member Verificado"}]}, {"name": "💟│𝐑𝐞𝐩𝐮𝐭𝐚𝐜𝐢𝐨𝐧𝐞𝐬", "nsfw": false, "type": 0, "topic": null, "position": 4, "parentName": "SOCIAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "ticket-0009", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "Tickets Estafas", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "📢│𝐂𝐨𝐦𝐮𝐧𝐢𝐜𝐚𝐝𝐨𝐬", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "INFORMACION", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "64", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "412317124672", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "📝│𝐑𝐞𝐜𝐥𝐮𝐭𝐚𝐦𝐢𝐞𝐧𝐭𝐨𝐬", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "LEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "412317125696", "type": 0, "allow": "1048576", "roleName": "Member"}]}, {"name": "𝗡𝗲𝗴𝗼𝗰𝗶𝗮𝗰𝗶𝗼𝗻𝗲𝘀", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "STAFF", "rateLimitPerUser": 0, "permissionOverwrites": []}, {"name": "closed-0046", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "ticket-0062", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "✉️│𝐈𝐧𝐯𝐢𝐭𝐚𝐜𝐢𝐨𝐧𝐞𝐬", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "SOCIAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1024", "roleName": "Member Verificado"}, {"deny": "1024", "type": 0, "allow": "1048576", "roleName": "Member"}]}, {"name": "📦│𝐎𝐭𝐫𝐨𝐬", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "VENTA X OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "3072", "roleName": "Member OOC"}, {"deny": "109951211018752", "type": 0, "allow": "1115136", "roleName": "Member Verificado"}]}, {"name": "🔎│𝐁𝐮𝐬𝐜𝐚𝐧𝐝𝐨", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "ILEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}]}, {"name": "ropaobjetos-valentid", "nsfw": false, "type": 0, "topic": null, "position": 5, "parentName": "Tickets De Venta", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "371776", "roleName": "Vendedor Certificado | Vapiano's Store"}, {"deny": "1024", "type": 1, "allow": "0", "roleName": null}]}, {"name": "🔎│𝐁𝐮𝐬𝐜𝐚𝐧𝐝𝐨", "nsfw": false, "type": 0, "topic": null, "position": 6, "parentName": "LEGAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "🔧│𝐌𝐨𝐝𝐬-𝐑𝐚𝐠𝐞𝐌𝐏", "nsfw": false, "type": 0, "topic": null, "position": 6, "parentName": "SOCIAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "1024", "type": 0, "allow": "1048576", "roleName": "Member"}]}, {"name": "closed-0005", "nsfw": false, "type": 0, "topic": null, "position": 6, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "🔎│𝐁𝐮𝐬𝐜𝐚𝐧𝐝𝐨", "nsfw": false, "type": 0, "topic": null, "position": 6, "parentName": "VENTA X OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "3072", "roleName": "Member OOC"}, {"deny": "109951211018752", "type": 0, "allow": "1115136", "roleName": "Member Verificado"}]}, {"name": "ticket-0064", "nsfw": false, "type": 0, "topic": null, "position": 6, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "3072", "roleName": null}]}, {"name": "ropaobjetos-farias_1", "nsfw": false, "type": 0, "topic": null, "position": 6, "parentName": "Tickets De Venta", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "1024", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 0, "allow": "371776", "roleName": "Vendedor Certificado | Vapiano's Store"}]}, {"name": "stock-mall", "nsfw": false, "type": 0, "topic": null, "position": 6, "parentName": "STAFF", "rateLimitPerUser": 0, "permissionOverwrites": []}, {"name": "closed-0006", "nsfw": false, "type": 0, "topic": null, "position": 7, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "🛠️│𝐒𝐞𝐫𝐯𝐢𝐜𝐢𝐨𝐬", "nsfw": false, "type": 0, "topic": null, "position": 7, "parentName": "SOCIAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "1024", "type": 0, "allow": "1048576", "roleName": "Member"}]}, {"name": "⚠️│𝐀𝐥𝐞𝐫𝐭𝐚𝐬", "nsfw": false, "type": 0, "topic": null, "position": 7, "parentName": "INFORMACION", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "2048", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "412317124672", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "ticket-0066", "nsfw": false, "type": 0, "topic": null, "position": 7, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "armascargas-djmalec", "nsfw": false, "type": 0, "topic": null, "position": 7, "parentName": "Tickets De Venta", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "371776", "roleName": "Vendedor Certificado | Vapiano's Store"}]}, {"name": "🏎️│𝗔𝘂𝘁𝗼𝘀", "nsfw": false, "type": 0, "topic": null, "position": 8, "parentName": "SOCIAL", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "1024", "type": 0, "allow": "1048576", "roleName": "Member"}]}, {"name": "closed-0007", "nsfw": false, "type": 0, "topic": null, "position": 8, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "ticket-0067", "nsfw": false, "type": 0, "topic": null, "position": 8, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "armascargas-martinlautaro_098", "nsfw": false, "type": 0, "topic": null, "position": 8, "parentName": "Tickets De Venta", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "363584", "roleName": null}, {"deny": "0", "type": 0, "allow": "371776", "roleName": "Vendedor Certificado | Vapiano's Store"}]}, {"name": "🎟️│𝐓𝐢𝐜𝐤𝐞𝐭𝐬", "nsfw": false, "type": 0, "topic": null, "position": 8, "parentName": "INFORMACION", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "412317124672", "type": 0, "allow": "1049600", "roleName": "Member"}]}, {"name": "closed-0010", "nsfw": false, "type": 0, "topic": null, "position": 9, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "ticket-0074", "nsfw": false, "type": 0, "topic": null, "position": 9, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "3072", "roleName": null}]}, {"name": "closed-0011", "nsfw": false, "type": 0, "topic": null, "position": 10, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "ticket-0075", "nsfw": false, "type": 0, "topic": null, "position": 10, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "ticket-0077", "nsfw": false, "type": 0, "topic": null, "position": 11, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0012", "nsfw": false, "type": 0, "topic": null, "position": 11, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "ticket-0078", "nsfw": false, "type": 0, "topic": null, "position": 12, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0015", "nsfw": false, "type": 0, "topic": null, "position": 12, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "ticket-0079", "nsfw": false, "type": 0, "topic": null, "position": 13, "parentName": "Tickets Verificación OOC", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "3072", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0016", "nsfw": false, "type": 0, "topic": null, "position": 13, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0017", "nsfw": false, "type": 0, "topic": null, "position": 14, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0018", "nsfw": false, "type": 0, "topic": null, "position": 15, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0020", "nsfw": false, "type": 0, "topic": null, "position": 16, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0021", "nsfw": false, "type": 0, "topic": null, "position": 17, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0022", "nsfw": false, "type": 0, "topic": null, "position": 18, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0023", "nsfw": false, "type": 0, "topic": null, "position": 19, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0025", "nsfw": false, "type": 0, "topic": null, "position": 20, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0026", "nsfw": false, "type": 0, "topic": null, "position": 21, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0028", "nsfw": false, "type": 0, "topic": null, "position": 22, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0030", "nsfw": false, "type": 0, "topic": null, "position": 23, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0031", "nsfw": false, "type": 0, "topic": null, "position": 24, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0032", "nsfw": false, "type": 0, "topic": null, "position": 25, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0033", "nsfw": false, "type": 0, "topic": null, "position": 26, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0034", "nsfw": false, "type": 0, "topic": null, "position": 27, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0035", "nsfw": false, "type": 0, "topic": null, "position": 28, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "ticket-0036", "nsfw": false, "type": 0, "topic": null, "position": 29, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0037", "nsfw": false, "type": 0, "topic": null, "position": 30, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0039", "nsfw": false, "type": 0, "topic": null, "position": 31, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0042", "nsfw": false, "type": 0, "topic": null, "position": 32, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0043", "nsfw": false, "type": 0, "topic": null, "position": 33, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0048", "nsfw": false, "type": 0, "topic": null, "position": 34, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0052", "nsfw": false, "type": 0, "topic": null, "position": 35, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0053", "nsfw": false, "type": 0, "topic": null, "position": 36, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0054", "nsfw": false, "type": 0, "topic": null, "position": 37, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0056", "nsfw": false, "type": 0, "topic": null, "position": 38, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0061", "nsfw": false, "type": 0, "topic": null, "position": 39, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0065", "nsfw": false, "type": 0, "topic": null, "position": 40, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0071", "nsfw": false, "type": 0, "topic": null, "position": 41, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0072", "nsfw": false, "type": 0, "topic": null, "position": 42, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "257040", "roleName": null}, {"deny": "0", "type": 1, "allow": "0", "roleName": null}]}, {"name": "closed-0073", "nsfw": false, "type": 0, "topic": null, "position": 43, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}, {"name": "closed-0076", "nsfw": false, "type": 0, "topic": null, "position": 44, "parentName": "Registro De Verificados", "rateLimitPerUser": 0, "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "0", "roleName": null}, {"deny": "0", "type": 1, "allow": "257040", "roleName": null}]}], "voiceChannels": [{"name": "👨🏽‍💻│𝐒𝐚𝐥𝐚 𝐒𝐭𝐚𝐟𝐟", "type": 2, "bitrate": 64000, "position": 0, "userLimit": 0, "parentName": "SOCIAL", "permissionOverwrites": [{"deny": "0", "type": 1, "allow": "1049600", "roleName": null}, {"deny": "0", "type": 1, "allow": "1049600", "roleName": null}]}, {"name": "🔉│𝐕𝐨𝐢𝐜𝐞", "type": 2, "bitrate": 64000, "position": 1, "userLimit": 0, "parentName": "SOCIAL", "permissionOverwrites": [{"deny": "0", "type": 0, "allow": "1049600", "roleName": "Member Verificado"}, {"deny": "1024", "type": 0, "allow": "1048576", "roleName": "Member"}]}], "systemChannelId": "1420045222775095298", "verificationLevel": 1, "explicitContentFilter": 2, "defaultMessageNotifications": 1}	38517	2026-03-16 00:44:40.557
\.


--
-- Data for Name: giveaways; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.giveaways (id, "guildId", "channelId", "messageId", "hostId", prize, description, winners, entries, "winnerIds", "endsAt", ended, "createdAt") FROM stdin;
\.


--
-- Data for Name: guild_configs; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.guild_configs (id, prefix, language, "createdAt", "updatedAt", "invitesEnabled", "moderationEnabled", "automodEnabled", "ticketsEnabled", "automationEnabled", "welcomeEnabled", "farewellEnabled", "welcomeChannelId", "welcomeMessage", "welcomeImageEnabled", "farewellChannelId", "farewellMessage", "modLogChannelId", "messageLogChannelId", "joinLeaveLogChannelId", "muteRoleId", "ticketCategoryId", "ticketLogChannelId", "ticketStaffRoleIds", "ticketCounter", "joinRoleIds", "antiSpamEnabled", "antiSpamThreshold", "antiSpamInterval", "antiFloodEnabled", "antiCapsEnabled", "antiCapsThreshold", "antiLinksEnabled", "antiLinksWhitelist", "blacklistedWords", "automodExemptRoleIds", "automodExemptChannelIds", "giveawayEnabled", "repChannelId", "repCooldown", "reputationEnabled", "starboardChannelId", "starboardEmoji", "starboardEnabled", "starboardThreshold", "suggestionsChannelId", "suggestionsEnabled", "suggestionsLogChannelId", "ticketCloseConfirmation", "ticketDMTranscript", "ticketTranscriptChannelId", "afkEnabled", "backupEnabled", "loggingEnabled", "stickyEnabled", "auditLogChannelId", "voiceLogChannelId", "antiCapsMinLength", "blacklistEnabled", "moduleAllowedRoles") FROM stdin;
1420045220325625898	!	en	2026-03-14 17:20:35.488	2026-03-16 06:00:46.89	t	t	t	t	t	t	t	1420055649953251479	Bienvenido {user} a {server}! fuiste invitado por {inviter}.	t	1477715499532947682	Salio {user}	\N	\N	\N	\N	\N	\N	{}	24	{}	f	5	5	f	f	70	f	{}	{}	{}	{}	f	1420875609554292836	86400	t	\N	⭐	f	3	\N	f	\N	t	t	\N	t	t	f	t	\N	\N	10	f	{}
\.


--
-- Data for Name: invites; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.invites (id, "guildId", "inviterId", "invitedId", code, fake, "left", "createdAt", "updatedAt") FROM stdin;
b6f8dea8-edab-4447-9eaa-f7fcf49b753a	1420045220325625898	469864457389080587	341382068380499990	SR5BySBS	f	f	2026-03-16 01:21:38.005	2026-03-16 01:21:38.005
c1ec4342-7512-4835-b38c-e51af70c39c0	1420045220325625898	593455144797208584	593455144797208584	mvw2fCqf	f	t	2026-03-16 01:31:41.472	2026-03-16 01:32:43.559
4d70eea4-104c-41c0-ba14-1df5d480ebe3	1420045220325625898	593455144797208584	593455144797208584	mvw2fCqf	f	t	2026-03-16 01:31:41.514	2026-03-16 01:32:43.559
f7b3e8cd-86d4-4d8c-b407-e7bb5ef5ed20	1420045220325625898	593455144797208584	593455144797208584	mvw2fCqf	f	t	2026-03-16 01:31:41.53	2026-03-16 01:32:43.559
4e4d5365-55b8-41d8-82bf-9e145e005986	1420045220325625898	593455144797208584	593455144797208584	mvw2fCqf	f	t	2026-03-16 01:32:47.628	2026-03-16 01:38:02.483
0018bc56-f68f-4cd0-b489-ca4537065aec	1420045220325625898	593455144797208584	593455144797208584	mvw2fCqf	f	t	2026-03-16 01:32:47.692	2026-03-16 01:38:02.483
5e03a963-6b99-41fb-9f56-8247bf6427ea	1420045220325625898	593455144797208584	593455144797208584	mvw2fCqf	f	t	2026-03-16 01:32:47.717	2026-03-16 01:38:02.483
2a4fe4cb-3fb0-4da0-b9a5-f24dfe7b0536	1420045220325625898	593455144797208584	593455144797208584	mvw2fCqf	f	t	2026-03-16 01:38:07.06	2026-03-16 01:39:27.079
cd1e3076-3840-41b5-a8b4-1ffd3e00c7b1	1420045220325625898	593455144797208584	593455144797208584	mvw2fCqf	f	t	2026-03-16 01:39:32.124	2026-03-16 01:43:06.326
45b4bea2-e690-4a01-a2c8-c17b112f9fb4	1420045220325625898	1438361558475608148	593455144797208584	C8HGEJBf	f	t	2026-03-16 03:15:09.462	2026-03-16 03:15:14.782
988eb6dc-d625-421b-8b41-52419b4da1bb	1420045220325625898	1438361558475608148	593455144797208584	C8HGEJBf	f	t	2026-03-16 03:15:53.578	2026-03-16 03:16:32.06
b79fb5df-b363-491b-a915-8e6b1662b088	1420045220325625898	823271763894730763	729897849499811901	Eje83gfn8J	f	f	2026-03-16 04:25:05.741	2026-03-16 04:25:05.741
\.


--
-- Data for Name: mod_actions; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.mod_actions (id, "guildId", "userId", "moderatorId", action, reason, duration, "expiresAt", active, "createdAt") FROM stdin;
b44f473e-3afd-4c73-97da-70f2f9c8dfa3	1420045220325625898	1438361558475608148	1105249076578095134	warn	maricon	\N	\N	t	2026-03-14 17:21:33.973
a1043950-16d2-40c0-84cf-99e58d2c33fd	1420045220325625898	1105249076578095134	1438361558475608148	warn	maricon segundo	\N	\N	t	2026-03-14 17:22:37.199
077851fc-b4a3-414e-8ba5-a5a533c3df03	1420045220325625898	1438361558475608148	1348480475575881740	warn	deeja de mal usar	\N	\N	t	2026-03-16 00:56:45.802
f836f831-b41d-4e8b-9f57-76e16f8bc250	1420045220325625898	1438361558475608148	1348480475575881740	warn	veneco  mrkç	\N	\N	t	2026-03-16 01:34:04.826
8b480c96-ada0-4cbc-9655-c03c232b70f7	1420045220325625898	1092969160268587128	1438361558475608148	ban	Sin razón proporcionada	\N	\N	t	2026-03-16 03:07:28.56
ba469811-5776-4fe0-b1b4-e7bf56bc4add	1420045220325625898	593455144797208584	1105249076578095134	ban	Sin razón proporcionada	\N	\N	t	2026-03-16 03:12:27.204
731173d8-4696-4c1b-9531-4c3b4c32a539	1420045220325625898	593455144797208584	1438361558475608148	ban	hola	\N	\N	t	2026-03-16 03:13:17.027
0613b0ba-1bed-475b-abd5-0af098433b89	1420045220325625898	593455144797208584	1105249076578095134	ban	Sin razón proporcionada	\N	\N	t	2026-03-16 03:15:14.68
c8f21453-7e0c-45c5-96a6-bd0a3bc9598f	1420045220325625898	593455144797208584	1438361558475608148	ban	ppor loco	\N	\N	t	2026-03-16 03:16:32.151
84b78bbd-e0e0-4a77-a230-1ba91b50a6e1	1420045220325625898	593455144797208584	1105249076578095134	ban	Se murio	\N	\N	t	2026-03-16 03:16:46.032
82558091-3536-4129-9e46-39586e1783a0	1420045220325625898	1092969160268587128	1105249076578095134	ban	a	\N	\N	t	2026-03-16 03:19:18.48
bf0099ed-1d9f-4d01-9b4f-a68078a695b9	1420045220325625898	593455144797208584	1105249076578095134	ban	a	\N	\N	t	2026-03-16 03:20:30.698
402c8afb-40c5-45f8-ad6d-f7f82d42e06c	1420045220325625898	1092969160268587128	1105249076578095134	ban	Sin razón proporcionada	\N	\N	t	2026-03-16 03:21:34.986
c6dfcb28-05fc-4f9e-8d3c-918644a85730	1420045220325625898	1092969160268587128	1105249076578095134	ban	fue un gusto	\N	\N	t	2026-03-16 03:23:00.13
\.


--
-- Data for Name: polls; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.polls (id, "guildId", "channelId", "messageId", question, options, votes, "creatorId", "endsAt", ended, "createdAt") FROM stdin;
\.


--
-- Data for Name: reaction_roles; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.reaction_roles (id, "guildId", "channelId", "messageId", emoji, "roleId", type) FROM stdin;
0197605f-6373-43d0-98c3-7dcbef2ceddd	1420045220325625898	1420055340531318886	1451065875921764393	✅	1420807840922075249	toggle
\.


--
-- Data for Name: reminders; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.reminders (id, "guildId", "userId", "channelId", message, "remindAt", fired, "createdAt") FROM stdin;
2fe1a0bb-8db4-4c2d-a315-8cbf9828ba30	1420045220325625898	1105249076578095134	1482981940477956198	recuerda	2026-03-16 06:02:15.132	t	2026-03-16 06:01:15.136
e3fd5642-d4bc-44ed-b595-2ed412dc6ba4	1420045220325625898	1438361558475608148	1482955291686342807	admaricon ven	2026-03-16 06:02:11.335	t	2026-03-16 06:01:11.337
d1d0fa9b-1216-4b6e-ac11-ab4874fb41c8	1420045220325625898	1105249076578095134	1482955291686342807	Mediacion	2026-03-16 06:07:08.757	t	2026-03-16 06:06:08.758
\.


--
-- Data for Name: reputations; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.reputations (id, "guildId", "userId", "giverId", reason, "createdAt") FROM stdin;
c1ce015a-ba50-4446-ae6e-d8a51be34f5c	1420045220325625898	1438361558475608148	1105249076578095134	\N	2026-03-16 05:17:52.858
2edff7ed-24ef-4552-9880-871463ff8e69	1420045220325625898	1105249076578095134	593455144797208584	\N	2026-03-16 00:26:53.412
a97c7276-9baf-4562-9a68-9c0957aac7e0	1420045220325625898	1438361558475608148	1092969160268587128	\N	2026-03-16 00:27:13.836
702cadb9-25ab-45da-b577-a9b85d962b40	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
e3e2474c-6271-4bd1-a363-b7805935e87a	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
2f8367fa-1a4b-4a02-852b-97249e385134	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
96fe9e7e-9011-49d6-afbe-2366004e6110	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
0e2b2b1f-6ec9-4d4d-9b33-8fb4cbec5c8a	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
4f4910d4-c203-4c41-9032-d5e1b53f41de	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
1fe38e38-88a2-44e2-8223-a603c0a21dca	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
dc7bfae6-b941-49c8-a9d8-7e862799e015	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
5626b751-d38a-4477-97a4-17b21d335296	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
667bf12b-d78b-4d10-9eea-fd93639ae394	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
32a7f4ac-6ccf-43c1-afd2-dbcbffc4fa1e	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
ecbcdf5b-b26a-45e8-8c33-2bd2c0dd2167	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
a3a46b75-ccfe-4bdc-a0ab-365695a878c4	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
730474d2-616f-49fb-9aff-8214e163b846	1420045220325625898	392519486596579338	0	Migrado desde YAGPDB	2026-03-16 00:55:59.185
c593c851-376f-4674-ad86-a0a54b78cacc	1420045220325625898	1414046264558878841	0	Migrado desde YAGPDB	2026-03-16 00:55:59.187
d3ef2e42-fc1b-457a-9c4f-0938f67e006a	1420045220325625898	1414046264558878841	0	Migrado desde YAGPDB	2026-03-16 00:55:59.187
a195b691-daac-4aca-be3f-2acf06714632	1420045220325625898	1414046264558878841	0	Migrado desde YAGPDB	2026-03-16 00:55:59.187
11a40f82-e485-4d70-9de5-a2f76e2384be	1420045220325625898	1414046264558878841	0	Migrado desde YAGPDB	2026-03-16 00:55:59.187
1357f224-7767-4b48-9bc3-e7cc0e42d72f	1420045220325625898	1414046264558878841	0	Migrado desde YAGPDB	2026-03-16 00:55:59.187
7771c36b-707e-4116-9c2e-074d94b2005b	1420045220325625898	1414046264558878841	0	Migrado desde YAGPDB	2026-03-16 00:55:59.187
6a8ff1b7-47ff-468d-8d49-b1c738b8f164	1420045220325625898	1414046264558878841	0	Migrado desde YAGPDB	2026-03-16 00:55:59.187
18dec922-c0c2-424f-a063-291f13b5bee7	1420045220325625898	1178760849880522883	0	Migrado desde YAGPDB	2026-03-16 00:55:59.188
35aead6f-8d62-4026-9617-efeffc793049	1420045220325625898	1178760849880522883	0	Migrado desde YAGPDB	2026-03-16 00:55:59.188
bdbad4c8-cd7c-4158-887b-700936d0132f	1420045220325625898	1178760849880522883	0	Migrado desde YAGPDB	2026-03-16 00:55:59.188
627f812b-75b9-4617-bf3a-f43b3e0df432	1420045220325625898	1178760849880522883	0	Migrado desde YAGPDB	2026-03-16 00:55:59.188
03e13702-c37c-4da1-8357-5fedc72b5417	1420045220325625898	1178760849880522883	0	Migrado desde YAGPDB	2026-03-16 00:55:59.188
b32eae54-2a29-41b2-b615-c20dfcb2495d	1420045220325625898	1178760849880522883	0	Migrado desde YAGPDB	2026-03-16 00:55:59.188
2ffa15ea-c20e-46ef-992e-a073d35d5836	1420045220325625898	787324748291244073	0	Migrado desde YAGPDB	2026-03-16 00:55:59.189
3b16ccdd-9a91-4f26-8492-652b78256376	1420045220325625898	787324748291244073	0	Migrado desde YAGPDB	2026-03-16 00:55:59.189
3049d41a-4a79-4852-a0f8-5cd6d3a64d01	1420045220325625898	787324748291244073	0	Migrado desde YAGPDB	2026-03-16 00:55:59.189
82efaf2c-2445-4533-a403-383c8eec953a	1420045220325625898	787324748291244073	0	Migrado desde YAGPDB	2026-03-16 00:55:59.189
8fb3334d-4074-466f-ab93-e4b6d380d33b	1420045220325625898	1468873195875467359	0	Migrado desde YAGPDB	2026-03-16 00:55:59.19
7870bc7a-3d23-495a-b3dd-358c2dd45bd7	1420045220325625898	1468873195875467359	0	Migrado desde YAGPDB	2026-03-16 00:55:59.19
f4e38e7f-d1f4-4267-a1c6-259af2f77469	1420045220325625898	1468873195875467359	0	Migrado desde YAGPDB	2026-03-16 00:55:59.19
6cbea27e-8976-409b-b1e4-8de72f11f1ba	1420045220325625898	740630491627126865	0	Migrado desde YAGPDB	2026-03-16 00:55:59.19
86fda328-3400-4e91-ae4a-26ae0b012f62	1420045220325625898	740630491627126865	0	Migrado desde YAGPDB	2026-03-16 00:55:59.19
5cbe0832-455c-412c-9d43-22a1df83c627	1420045220325625898	740630491627126865	0	Migrado desde YAGPDB	2026-03-16 00:55:59.19
4c6aac5a-af51-4754-bcbc-6737271687da	1420045220325625898	909880231203061842	0	Migrado desde YAGPDB	2026-03-16 00:55:59.192
7c568ed6-c05e-44e2-ab9e-d2e99221cac6	1420045220325625898	909880231203061842	0	Migrado desde YAGPDB	2026-03-16 00:55:59.192
c2ebd59c-6241-44f9-be27-02b8000b48c2	1420045220325625898	909880231203061842	0	Migrado desde YAGPDB	2026-03-16 00:55:59.192
ad49476d-5ddb-4389-8c7f-da64d9ed2155	1420045220325625898	1321682391751725078	0	Migrado desde YAGPDB	2026-03-16 00:55:59.192
4efaf508-2e74-4e36-98f5-062115529c44	1420045220325625898	1321682391751725078	0	Migrado desde YAGPDB	2026-03-16 00:55:59.192
e021924a-ecc7-4e7e-8cc0-4966fed6cfee	1420045220325625898	1321682391751725078	0	Migrado desde YAGPDB	2026-03-16 00:55:59.192
a2111c20-83af-42a0-b306-76c5d7f76cab	1420045220325625898	1310322305473318912	0	Migrado desde YAGPDB	2026-03-16 00:55:59.193
6264257f-7fd5-487f-95a8-2992be431056	1420045220325625898	1310322305473318912	0	Migrado desde YAGPDB	2026-03-16 00:55:59.193
d67c7e0a-2e0b-49ab-b82b-bf6c0664c2bb	1420045220325625898	590620682295967744	0	Migrado desde YAGPDB	2026-03-16 00:55:59.194
2002b9d5-059e-4a45-8a0a-e44c545294b4	1420045220325625898	590620682295967744	0	Migrado desde YAGPDB	2026-03-16 00:55:59.194
157bd586-18f1-490b-9896-910ab2583887	1420045220325625898	718166966048915566	0	Migrado desde YAGPDB	2026-03-16 00:55:59.194
cfd72a88-6396-4287-9675-f05653f5abda	1420045220325625898	718166966048915566	0	Migrado desde YAGPDB	2026-03-16 00:55:59.194
c4596b73-6c78-499b-960a-b846920456f2	1420045220325625898	701557429158281317	0	Migrado desde YAGPDB	2026-03-16 00:55:59.195
c5298999-00d0-460b-a991-c9033243cf02	1420045220325625898	701557429158281317	0	Migrado desde YAGPDB	2026-03-16 00:55:59.195
57b0d346-73f0-48e0-8ffc-739c8fab09a5	1420045220325625898	1422073029797875762	0	Migrado desde YAGPDB	2026-03-16 00:55:59.196
d0131b76-1fd3-48e3-82fd-e9f024036df7	1420045220325625898	1422073029797875762	0	Migrado desde YAGPDB	2026-03-16 00:55:59.196
92343c2b-cec3-463d-ad95-aa81705ab2e1	1420045220325625898	1438361558475608148	0	Migrado desde YAGPDB	2026-03-16 00:55:59.197
8d7a0caa-4736-4c1c-a96e-fb6bb71e2234	1420045220325625898	1438361558475608148	0	Migrado desde YAGPDB	2026-03-16 00:55:59.197
0543ad2f-edc8-4eb4-9a47-d5a77742e34b	1420045220325625898	829705095721255003	0	Migrado desde YAGPDB	2026-03-16 00:55:59.197
dc9857e5-104d-40e1-a40b-e09a236525b9	1420045220325625898	829705095721255003	0	Migrado desde YAGPDB	2026-03-16 00:55:59.197
b98ca80b-41eb-4283-bcd9-8d40c9a69dc1	1420045220325625898	816715088043966506	0	Migrado desde YAGPDB	2026-03-16 00:55:59.198
af9f0b25-d208-48e3-84dc-d916a5749dd7	1420045220325625898	816715088043966506	0	Migrado desde YAGPDB	2026-03-16 00:55:59.198
f6a0aa31-dbfa-4bec-87e8-acdb18ac454a	1420045220325625898	823271763894730763	0	Migrado desde YAGPDB	2026-03-16 00:55:59.199
a5d13eaa-cb7c-46d8-b731-2a85c6539c22	1420045220325625898	823271763894730763	0	Migrado desde YAGPDB	2026-03-16 00:55:59.199
68b1bf93-8db0-4428-b9d2-c322ce91b116	1420045220325625898	246744976816472065	0	Migrado desde YAGPDB	2026-03-16 00:55:59.201
3cf772df-6863-42b6-8852-4bc7703a1ae6	1420045220325625898	1110673320413777941	0	Migrado desde YAGPDB	2026-03-16 00:55:59.202
2657dfae-53f8-496c-9df1-34f70a1aba27	1420045220325625898	1235418631857246272	0	Migrado desde YAGPDB	2026-03-16 00:55:59.202
70d2d335-5526-4e43-94eb-0e5716798f98	1420045220325625898	1238708636167966841	0	Migrado desde YAGPDB	2026-03-16 00:55:59.203
885b1235-eca2-4b49-81ba-64d3de24bb4e	1420045220325625898	1243990418291429477	0	Migrado desde YAGPDB	2026-03-16 00:55:59.204
c4c2fa83-7383-4daf-8e29-97cec987cc13	1420045220325625898	1250482971341754493	0	Migrado desde YAGPDB	2026-03-16 00:55:59.205
68208757-95d3-4dd2-812d-c4cc3dd0c0e8	1420045220325625898	1365109875243352146	0	Migrado desde YAGPDB	2026-03-16 00:55:59.205
1325451c-5285-453a-ad96-d779a9588804	1420045220325625898	1421718493723627621	0	Migrado desde YAGPDB	2026-03-16 00:55:59.206
1c05f5a5-5280-4f78-a872-b71c0ac3e46c	1420045220325625898	1462969890414657629	0	Migrado desde YAGPDB	2026-03-16 00:55:59.207
ea066971-006b-4e4f-8cbf-b504d5af3b9a	1420045220325625898	1463704350009589873	0	Migrado desde YAGPDB	2026-03-16 00:55:59.208
735c5a0c-07bf-49b5-a665-66fb6070b973	1420045220325625898	1105249076578095134	0	Migrado desde YAGPDB	2026-03-16 00:55:59.209
b0c6ac3e-e39e-4628-af0c-700050ac31dd	1420045220325625898	314918742406463498	0	Migrado desde YAGPDB	2026-03-16 00:55:59.21
3fa3772f-e9bf-48a2-9487-9b79923e699d	1420045220325625898	349544854025666561	0	Migrado desde YAGPDB	2026-03-16 00:55:59.21
7b62ed87-4c31-4973-9b41-c0e6b7bc30a7	1420045220325625898	395294689265188864	0	Migrado desde YAGPDB	2026-03-16 00:55:59.211
f009db8d-5449-49e1-afa0-9f8de6d1056c	1420045220325625898	472626841627394058	0	Migrado desde YAGPDB	2026-03-16 00:55:59.212
f74e7b32-00cb-4108-99a7-000b4ab3ccfc	1420045220325625898	496290349413695500	0	Migrado desde YAGPDB	2026-03-16 00:55:59.212
6a0cc553-ec8e-4c64-8c9d-5e2367ccdca4	1420045220325625898	547840418965094400	0	Migrado desde YAGPDB	2026-03-16 00:55:59.213
a0acf4ed-8530-48a5-8e2c-3b1a4cf045f5	1420045220325625898	562433415371292683	0	Migrado desde YAGPDB	2026-03-16 00:55:59.213
61fd40c4-4375-444e-a67b-3f542050a660	1420045220325625898	751581317841551360	0	Migrado desde YAGPDB	2026-03-16 00:55:59.214
416b4dfa-5021-4763-aa4e-bd158a42d44c	1420045220325625898	754522070666182757	0	Migrado desde YAGPDB	2026-03-16 00:55:59.215
c184a5b9-c8ab-4337-8e1e-648d184f49b6	1420045220325625898	776309492601192461	0	Migrado desde YAGPDB	2026-03-16 00:55:59.215
47032798-6056-4672-afef-83f85d36b38b	1420045220325625898	852762041772670997	0	Migrado desde YAGPDB	2026-03-16 00:55:59.216
8a6deb6b-2d31-4bb5-a3a1-69c5cc727bcc	1420045220325625898	881331920796004422	0	Migrado desde YAGPDB	2026-03-16 00:55:59.217
7fe90e29-0f95-4cc7-8d68-bacb0d3498cf	1420045220325625898	927050707788505098	0	Migrado desde YAGPDB	2026-03-16 00:55:59.217
01650736-2181-4930-afba-6efaca4e37cc	1420045220325625898	934196943939334174	0	Migrado desde YAGPDB	2026-03-16 00:55:59.218
1ae05405-3525-4f85-b62a-41547d65904a	1420045220325625898	1069699393638367293	0	Migrado desde YAGPDB	2026-03-16 00:55:59.218
44f95554-7f11-41fc-8748-58b74a183a84	1420045220325625898	1070431927380738110	0	Migrado desde YAGPDB	2026-03-16 00:55:59.219
d24fe94c-16d0-4ad8-adc0-c737488b411f	1420045220325625898	1100449279790809261	0	Migrado desde YAGPDB	2026-03-16 00:55:59.22
3416cb0d-db17-4869-8db2-4a10609a744a	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
7d9440fa-a865-48f0-a2e6-8c11b0467c09	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
a1702e38-251e-4e2b-841c-f6863bf9c6e3	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
a62acb4a-7602-484a-bcee-fbc88ad754f5	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
79731727-5fe2-49b4-95ca-a7ee05dd23fd	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
72a62991-5cac-4033-90ee-efb91cd1b58d	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
69da91c2-1e6d-4df3-9add-32a22b2df7e1	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
45e0c94d-0a1b-42d3-9626-09f79123bcb9	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
695a48b6-e038-4586-9018-4c09b922595e	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
79410846-9bbe-4758-b2e7-466bd9fb1349	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
fe6fd6db-87aa-4ff7-8bc8-45d87db20ea8	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
5e4a2c77-09d2-4c32-b172-ef4c2d9cbac9	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
7c0134ba-40be-4458-bfc6-1f4b057af572	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
43661bb6-4e5d-4391-a4e5-0815b9a3aa58	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
cad978df-ce70-4f27-8ee5-451514d68a19	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
52f1567d-f5e4-4237-8464-c7eabc8b841a	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
5499c8b5-8c1c-43fa-b987-6ccfd216adcc	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
ebc783ed-36a3-499a-978b-3331e943e0fe	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
2d3e3d7e-10bc-4d2d-9868-bf18fb0e920f	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
22a64cb2-cc75-4e8c-b5d1-acfdf204b099	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
812075a8-1405-4dc7-979f-4a872851cf2a	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
77c05b93-5c1b-44ba-9a10-36622711f582	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
71a2006b-2127-4c83-8227-e3a924870199	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
e30fc5e1-6562-4094-b7b0-dc7e78ea7b80	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
09aa92b7-785d-4794-95a8-baae3c2ed2ed	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
0c5aaf12-244b-48aa-99bb-004a58ba2f68	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
806c4372-0787-4e8c-b273-f74820e6731e	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
35686505-94eb-4053-87b5-981dae4bd89e	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
c6d75c1b-c735-48b2-950d-9fe02a624d34	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
de30c687-2bae-4333-8c29-88e7b05ed4be	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
e548fe77-209d-414a-a7ff-baaa570083f3	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
3bea98ba-5347-4b78-bf9c-afed7598331e	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
206e01b4-35b4-4893-8346-8618b7886c38	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
e230a356-0ad7-406d-97b9-7e2987f41d2f	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
514086d1-d227-4896-9b07-1fbf92b359f5	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
b7f29393-bb58-4020-8fe0-2c623bf84cae	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
f7271eb6-d763-4272-8a67-25cec79751c8	1420045220325625898	1348480475575881740	0	Migrado desde YAGPDB	2026-03-16 00:56:24.323
\.


--
-- Data for Name: scheduled_messages; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.scheduled_messages (id, "guildId", "channelId", message, cron, enabled, "lastRun", "createdAt") FROM stdin;
\.


--
-- Data for Name: starboard_entries; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.starboard_entries (id, "guildId", "originalMsgId", "originalChId", "starboardMsgId", "authorId", stars, content, "attachmentUrl", "createdAt") FROM stdin;
\.


--
-- Data for Name: sticky_messages; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.sticky_messages (id, "guildId", "channelId", "messageId", title, description, color, enabled, "createdBy", "createdAt", "updatedAt") FROM stdin;
64c8729f-4ce9-410f-84fe-8de3c99b7783	1420045220325625898	1420881187236483102	1482969653897596970	**Formato**	 ```\nVendo:\nCantidad:\nPrecio:\nFotos:\n```	#5865F2	t	1105249076578095134	2026-03-16 04:47:36.436	2026-03-16 05:11:58.273
f9231c6e-40d2-4a5d-aaad-6bdcbc126a52	1420045220325625898	1449255602302746826	1482984719497826364	**Formato**	```\nBuscando:\nCantidad:\nCuanto doy:\n```	#5865F2	t	1105249076578095134	2026-03-16 04:54:34.89	2026-03-16 06:11:49.784
a1f5bb03-6f26-4302-8e30-e5f83b8065f9	1420045220325625898	1449242302156378112	1482964671408504894	**Formato**	```\nBuscando:\nCantidad:\nCuanto doy:\n```	#5865F2	t	1105249076578095134	2026-03-16 04:49:24.343	2026-03-16 04:53:00.927
638c33c4-c992-4d40-9257-5e6eae496b3f	1420045220325625898	1451340402249564380	\N	**Formato**	```\nBuscando:\nCantidad:\nCuanto doy:\n```	#5865F2	t	1105249076578095134	2026-03-16 04:55:27.827	2026-03-16 05:10:31.519
3834940a-dc55-4bd3-bf56-32ba49aac777	1420045220325625898	1449241767705706569	\N	**Formato**	 ```\nVendo:\nCantidad: \nPrecio:\nFotos:\n```	#5865F2	t	1105249076578095134	2026-03-16 04:47:03.727	2026-03-16 05:11:14.38
25903340-80c0-4b31-b82e-72191766a7cd	1420045220325625898	1449242230903804066	\N	**Formato**	 ```\nVendo:\nCantidad:\nPrecio:\nFotos:\n```	#5865F2	t	1105249076578095134	2026-03-16 04:48:22.188	2026-03-16 05:11:24.319
\.


--
-- Data for Name: suggestions; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.suggestions (id, "guildId", "channelId", "messageId", "userId", content, status, upvotes, downvotes, "staffNote", "reviewedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ticket_panels; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.ticket_panels (id, "guildId", "channelId", "messageId", title, description, "buttonLabel", "buttonEmoji", "categoryId", "staffRoleIds", "createdAt", "adminRoleIds", "buttonColor", "claimEnabled", "claimLockOthers", "closeRequestEnabled", "closeRequestMessage", "closedCategoryId", "embedColor", "escalatePanelId", "feedbackEnabled", "feedbackMessage", "footerText", "formEnabled", "formQuestions", "formTitle", "logChannelId", "mentionCreator", "mentionStaff", name, "namingPattern", "showClaimButton", "showCloseButton", "showTranscriptButton", style, "ticketLimit", "transcriptChannelId", "transcriptDMStaff", "transcriptDMUser", "transcriptEnabled", "updatedAt", "welcomeColor", "welcomeMessage", "welcomeTitle", "autoCloseHours") FROM stdin;
1293ce10-a894-4f69-a8e2-b53bfc6889e1	1420045220325625898	1420907241124663297	1482947968758972437	Reporte de Estafa	Reporta un intento de estafa o si ya fuiste estafado.	Estafas	🐀	1420598305880014872	{}	2026-03-16 03:03:50.081	{}	Danger	t	f	t	¿Estás seguro de que quieres cerrar este ticket?	1474504995205419302	#5865F2	\N	f	How would you rate the support you received?	\N	f	null	Ticket Form	\N	t	t	Estafas	estafas-{username}	t	t	t	button	999	\N	f	f	t	2026-03-16 04:18:10.902	#5865F2	En un momento serás atendido por un miembro del staff para revisar el caso, puede entregarnos información sobre el usuario. \n\n<@&1420053757206728756> <@&1420807654770479206>	Bienvenido al ticket {user}.	0
d8c6144b-8cb7-49d3-a997-f340363b7898	1420045220325625898	1420907241124663297	1482947968758972437	Mediación	Solicita un mediador del staff para que tu compra o venta sea segura. (Un valor de 200K IC)	Mediación	🤝	1420597419334307870	{}	2026-03-16 03:03:50.063	{}	Primary	t	f	t	¿Estás seguro de que quieres cerrar este ticket?	1474504995205419302	#5865F2	\N	f	How would you rate the support you received?	\N	f	null	Ticket Form	\N	t	t	Mediación	mediacion-{username}	t	t	t	button	999	\N	f	f	t	2026-03-16 04:18:10.902	#5865F2	En un momento serás atendido por un miembro del staff para realizar la mediación.\n\n<@&1420053757206728756> <@&1420807654770479206> <@&1451279316863160380>	Bienvenido al ticket {user}.	0
3a1afdc4-f764-45c0-9a84-6bafeea7a3ac	1420045220325625898	1420907241124663297	1482947968758972437	Verificación OOC	Solicita el rango necesario para poder hacer ventas OOC.	Verificación OOC	💰	1474505727862378619	{}	2026-03-16 03:03:50.079	{}	Success	t	f	t	¿Estás seguro de que quieres cerrar este ticket?	1474506249327481057	#5865F2	\N	f	How would you rate the support you received?	\N	f	\N	Ticket Form	\N	t	t	Verificación OOC	verificacion-{username}	t	t	t	button	999	\N	f	f	t	2026-03-16 04:18:10.902	#5865F2	Para la verificación, requieres enviar foto de cada uno de los personajes IC y esperar a un miembro del staff.\n\n<@&1420053757206728756> <@&1420807654770479206>	Bienvenido al ticket {user}.	0
f08c9ff9-899f-492d-9290-be4399366602	1420045220325625898	1420907241124663297	1482947968758972437	Soporte	Abre un ticket para dudas o problemas con el marketplace.	Soporte	📞	1420806911866962030	{}	2026-03-16 03:03:50.076	{}	Secondary	t	f	t	¿Estás seguro de que quieres cerrar este ticket?	1474504995205419302	#5865F2	\N	f	How would you rate the support you received?	\N	f	null	Ticket Form	\N	t	t	Soporte	soporte-{username}	t	t	t	button	999	\N	f	f	t	2026-03-16 04:18:10.902	#5865F2	En un momento serás atendido por un miembro del staff, de momento informandonos cual sería el problema o duda que presentas con el marketplace.\n\n<@&1420053757206728756> <@&1420807654770479206>	Bienvenido al ticket {user}.	0
\.


--
-- Data for Name: ticket_transcripts; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.ticket_transcripts (id, "ticketId", "panelId", "guildId", "channelId", "userId", "closedBy", "messageCount", messages, "htmlContent", "createdAt") FROM stdin;
a6013539-989f-4f92-8fcc-0df5052f4efc	a72c42f4-ae6c-43ae-b7fa-f28639d0ba32	d8c6144b-8cb7-49d3-a997-f340363b7898	1420045220325625898	1482937866790109255	1438361558475608148	1438361558475608148	1	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1438361558475608148>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T03:05:39.351Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #7</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0007</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: ticket-0007</span>\n      <span>Creado: 3/15/2026, 10:05:39 PM</span>\n      <span>Cerrado: 3/15/2026, 10:05:48 PM</span>\n      <span>Mensajes: 1</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 10:05:39 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1438361558475608148</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 10:05:48 PM\n  </div>\n</body>\n</html>	2026-03-16 03:05:48.689
7ff17e69-da96-46ca-bbd0-3a2c75c32bc1	2c434397-66f6-44ed-99be-174010d79588	\N	1420045220325625898	1482497686186889419	1438361558475608148	1438361558475608148	1	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1438361558475608148>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/b6280dc41c6ed474d62adbc311c904cc.webp?size=64", "timestamp": "2026-03-14T21:56:32.237Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcript - Ticket #4</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0004</h1>\n    <div class="meta">\n      <span>Server: Vapiano's | GTAHUB.GG</span>\n      <span>Channel: ticket-0004</span>\n      <span>Created: 3/14/2026, 4:56:32 PM</span>\n      <span>Closed: 3/14/2026, 4:56:38 PM</span>\n      <span>Messages: 1</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/b6280dc41c6ed474d62adbc311c904cc.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/14/26, 4:56:32 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1438361558475608148</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generated by Vapiano Bot &bull; 3/14/2026, 4:56:38 PM\n  </div>\n</body>\n</html>	2026-03-14 21:56:38.533
db9c86e3-fcd9-4f75-949a-fdd9893004be	2c434397-66f6-44ed-99be-174010d79588	\N	1420045220325625898	1482497686186889419	1438361558475608148	1438361558475608148	1	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1438361558475608148>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/b6280dc41c6ed474d62adbc311c904cc.webp?size=64", "timestamp": "2026-03-14T21:56:32.237Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcript - Ticket #4</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0004</h1>\n    <div class="meta">\n      <span>Server: Vapiano's | GTAHUB.GG</span>\n      <span>Channel: ticket-0004</span>\n      <span>Created: 3/14/2026, 4:56:32 PM</span>\n      <span>Closed: 3/14/2026, 4:56:48 PM</span>\n      <span>Messages: 1</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/b6280dc41c6ed474d62adbc311c904cc.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/14/26, 4:56:32 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1438361558475608148</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generated by Vapiano Bot &bull; 3/14/2026, 4:56:48 PM\n  </div>\n</body>\n</html>	2026-03-14 21:56:48.957
148a39f4-a98e-41b8-b16b-ec797a7d15d3	5af59b1b-a4af-4972-ad91-8703fdb99bb5	\N	1420045220325625898	1482497922435252374	1438361558475608148	1438361558475608148	4	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1438361558475608148>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/b6280dc41c6ed474d62adbc311c904cc.webp?size=64", "timestamp": "2026-03-14T21:57:28.443Z", "attachments": []}, {"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/b6280dc41c6ed474d62adbc311c904cc.webp?size=64", "timestamp": "2026-03-14T21:57:37.291Z", "attachments": []}, {"isBot": false, "author": "kehg", "embeds": 0, "content": "yola", "authorId": "1438361558475608148", "avatarUrl": "https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64", "timestamp": "2026-03-14T21:57:40.513Z", "attachments": []}, {"isBot": false, "author": "kehg", "embeds": 0, "content": "tola", "authorId": "1438361558475608148", "avatarUrl": "https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64", "timestamp": "2026-03-14T21:57:41.874Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcript - Ticket #5</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0005</h1>\n    <div class="meta">\n      <span>Server: Vapiano's | GTAHUB.GG</span>\n      <span>Channel: ticket-0005</span>\n      <span>Created: 3/14/2026, 4:57:28 PM</span>\n      <span>Closed: 3/14/2026, 4:57:48 PM</span>\n      <span>Messages: 4</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/b6280dc41c6ed474d62adbc311c904cc.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/14/26, 4:57:28 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1438361558475608148</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/b6280dc41c6ed474d62adbc311c904cc.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/14/26, 4:57:37 PM</span>\n          </div>\n          \n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">kehg</span>\n            \n            <span class="timestamp">3/14/26, 4:57:40 PM</span>\n          </div>\n          <div class="content">yola</div>\n          \n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">kehg</span>\n            \n            <span class="timestamp">3/14/26, 4:57:41 PM</span>\n          </div>\n          <div class="content">tola</div>\n          \n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generated by Vapiano Bot &bull; 3/14/2026, 4:57:48 PM\n  </div>\n</body>\n</html>	2026-03-14 21:57:48.004
0e0e81b0-c9ff-4690-bf3f-8a14095689b3	a72c42f4-ae6c-43ae-b7fa-f28639d0ba32	d8c6144b-8cb7-49d3-a997-f340363b7898	1420045220325625898	1482937866790109255	1438361558475608148	1438361558475608148	4	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1438361558475608148>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T03:05:39.351Z", "attachments": []}, {"isBot": false, "author": "kehg", "embeds": 0, "content": "<@1105249076578095134>", "authorId": "1438361558475608148", "avatarUrl": "https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64", "timestamp": "2026-03-16T03:06:07.052Z", "attachments": []}, {"isBot": false, "author": "kehg", "embeds": 0, "content": "mira", "authorId": "1438361558475608148", "avatarUrl": "https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64", "timestamp": "2026-03-16T03:06:08.055Z", "attachments": []}, {"isBot": false, "author": "kehg", "embeds": 0, "content": "ingles", "authorId": "1438361558475608148", "avatarUrl": "https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64", "timestamp": "2026-03-16T03:06:09.098Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #7</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0007</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: ticket-0007</span>\n      <span>Creado: 3/15/2026, 10:05:39 PM</span>\n      <span>Cerrado: 3/15/2026, 10:33:23 PM</span>\n      <span>Mensajes: 4</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 10:05:39 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1438361558475608148</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">kehg</span>\n            \n            <span class="timestamp">3/15/26, 10:06:07 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1105249076578095134</span></div>\n          \n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">kehg</span>\n            \n            <span class="timestamp">3/15/26, 10:06:08 PM</span>\n          </div>\n          <div class="content">mira</div>\n          \n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">kehg</span>\n            \n            <span class="timestamp">3/15/26, 10:06:09 PM</span>\n          </div>\n          <div class="content">ingles</div>\n          \n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 10:33:23 PM\n  </div>\n</body>\n</html>	2026-03-16 03:33:23.564
c9a5d106-10c2-434f-8a3b-ed70b1403008	6c2f910e-de10-4e18-8208-4b9270a8e2a0	d8c6144b-8cb7-49d3-a997-f340363b7898	1420045220325625898	1482949866077556769	1438361558475608148	1438361558475608148	1	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1438361558475608148>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T03:53:20.272Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #13</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0013</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: mediacion-nooghv_</span>\n      <span>Creado: 3/15/2026, 10:53:20 PM</span>\n      <span>Cerrado: 3/15/2026, 10:53:51 PM</span>\n      <span>Mensajes: 1</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 10:53:20 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1438361558475608148</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 10:53:51 PM\n  </div>\n</body>\n</html>	2026-03-16 03:53:51.995
15359ee3-b82c-4da0-ae6c-32212f5a4755	5ee30d73-de84-4e63-98d6-882f41428740	f08c9ff9-899f-492d-9290-be4399366602	1420045220325625898	1482954154396749965	1105249076578095134	1105249076578095134	1	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1105249076578095134>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:10:22.704Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #17</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0017</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: soporte-adriandave_</span>\n      <span>Creado: 3/15/2026, 11:10:22 PM</span>\n      <span>Cerrado: 3/15/2026, 11:12:08 PM</span>\n      <span>Mensajes: 1</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:10:22 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1105249076578095134</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 11:12:08 PM\n  </div>\n</body>\n</html>	2026-03-16 04:12:08.703
8e99e1c5-b3a9-4fa2-8ed0-e5ca6b120770	e3081d22-7242-49e4-82bb-150848c8d242	d8c6144b-8cb7-49d3-a997-f340363b7898	1420045220325625898	1482944504410542194	1105249076578095134	1105249076578095134	2	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1105249076578095134>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T03:32:02.188Z", "attachments": []}, {"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T03:32:29.533Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #8</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0008</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: ticket-0008</span>\n      <span>Creado: 3/15/2026, 10:32:02 PM</span>\n      <span>Cerrado: 3/15/2026, 11:13:09 PM</span>\n      <span>Mensajes: 2</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 10:32:02 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1105249076578095134</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 10:32:29 PM</span>\n          </div>\n          \n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 11:13:09 PM\n  </div>\n</body>\n</html>	2026-03-16 04:13:09.024
145fa534-0cac-45d4-b444-5c16cd46d256	081ce56c-daa5-4aa0-aa25-da06b32d5d9e	d8c6144b-8cb7-49d3-a997-f340363b7898	1420045220325625898	1482956315419607102	1438361558475608148	1438361558475608148	1	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1438361558475608148>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:18:57.837Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #22</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0022</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: mediacion-nooghv_</span>\n      <span>Creado: 3/15/2026, 11:18:57 PM</span>\n      <span>Cerrado: 3/15/2026, 11:19:08 PM</span>\n      <span>Mensajes: 1</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:18:57 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1438361558475608148</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 11:19:08 PM\n  </div>\n</body>\n</html>	2026-03-16 04:19:08.563
57d55a56-0852-4b09-bbf0-97d556d95709	30e02243-1dbe-44e4-ba3f-214bff54fbb0	d8c6144b-8cb7-49d3-a997-f340363b7898	1420045220325625898	1482955269205131426	1105249076578095134	1105249076578095134	2	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1105249076578095134>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:14:48.486Z", "attachments": []}, {"isBot": true, "author": "Vapiano's", "embeds": 0, "content": "", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:19:42.716Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #18</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0018</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: mediacion-adriandave_</span>\n      <span>Creado: 3/15/2026, 11:14:48 PM</span>\n      <span>Cerrado: 3/15/2026, 11:19:43 PM</span>\n      <span>Mensajes: 2</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:14:48 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1105249076578095134</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:19:42 PM</span>\n          </div>\n          \n          \n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 11:19:43 PM\n  </div>\n</body>\n</html>	2026-03-16 04:19:43.42
90a36c62-d2cd-47dd-8150-792b04eddd61	af82d6f0-9bd5-4143-a779-e6ce9f06a34b	f08c9ff9-899f-492d-9290-be4399366602	1420045220325625898	1482955276335316993	1105249076578095134	1105249076578095134	2	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1105249076578095134>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:14:50.498Z", "attachments": []}, {"isBot": true, "author": "Vapiano's", "embeds": 0, "content": "", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:20:03.103Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #19</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0019</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: soporte-adriandave_</span>\n      <span>Creado: 3/15/2026, 11:14:50 PM</span>\n      <span>Cerrado: 3/15/2026, 11:20:03 PM</span>\n      <span>Mensajes: 2</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:14:50 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1105249076578095134</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:20:03 PM</span>\n          </div>\n          \n          \n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 11:20:03 PM\n  </div>\n</body>\n</html>	2026-03-16 04:20:03.79
0e3a40ec-1004-409d-8fbe-36b3c434cbe4	4920f123-7a83-4824-9394-d6d705272bec	f08c9ff9-899f-492d-9290-be4399366602	1420045220325625898	1482952987096907796	1105249076578095134	1105249076578095134	4	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1105249076578095134>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:05:44.373Z", "attachments": []}, {"isBot": false, "author": "kehg", "embeds": 0, "content": "pon q taguee", "authorId": "1438361558475608148", "avatarUrl": "https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64", "timestamp": "2026-03-16T04:06:26.846Z", "attachments": []}, {"isBot": false, "author": "Adrian", "embeds": 0, "content": "si", "authorId": "1105249076578095134", "avatarUrl": "https://cdn.discordapp.com/avatars/1105249076578095134/62065f2f79f06641f60c8d621acbfc1b.webp?size=64", "timestamp": "2026-03-16T04:06:35.443Z", "attachments": []}, {"isBot": true, "author": "Vapiano's", "embeds": 0, "content": "", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:20:35.170Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #16</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0016</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: soporte-adriandave_</span>\n      <span>Creado: 3/15/2026, 11:05:44 PM</span>\n      <span>Cerrado: 3/15/2026, 11:20:35 PM</span>\n      <span>Mensajes: 4</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:05:44 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1105249076578095134</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1438361558475608148/3c9ee2a45aeef2b69558e6fbac25db6f.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">kehg</span>\n            \n            <span class="timestamp">3/15/26, 11:06:26 PM</span>\n          </div>\n          <div class="content">pon q taguee</div>\n          \n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1105249076578095134/62065f2f79f06641f60c8d621acbfc1b.webp?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Adrian</span>\n            \n            <span class="timestamp">3/15/26, 11:06:35 PM</span>\n          </div>\n          <div class="content">si</div>\n          \n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:20:35 PM</span>\n          </div>\n          \n          \n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 11:20:35 PM\n  </div>\n</body>\n</html>	2026-03-16 04:20:35.954
276ba848-e5dc-4753-b606-0e926cc3905d	a6e068c9-2c3f-42de-a8ff-f68e372eb938	d8c6144b-8cb7-49d3-a997-f340363b7898	1420045220325625898	1482957856490786999	1438361558475608148	1105249076578095134	3	[{"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "<@1438361558475608148>", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:25:05.318Z", "attachments": []}, {"isBot": true, "author": "Vapiano's", "embeds": 1, "content": "", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:26:07.067Z", "attachments": []}, {"isBot": true, "author": "Vapiano's", "embeds": 0, "content": "", "authorId": "1482419113094811658", "avatarUrl": "https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64", "timestamp": "2026-03-16T04:26:23.249Z", "attachments": []}]	<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Transcripcion - Ticket #23</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { background: #36393f; color: #dcddde; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.4; }\n  .header { background: #2f3136; padding: 24px; border-bottom: 1px solid #202225; }\n  .header h1 { color: #fff; font-size: 22px; margin-bottom: 8px; }\n  .header .meta { color: #b9bbbe; font-size: 13px; }\n  .header .meta span { margin-right: 16px; }\n  .messages { padding: 16px; }\n  .message { display: flex; gap: 16px; padding: 4px 16px; margin: 2px 0; border-radius: 4px; }\n  .message:hover { background: #32353b; }\n  .avatar img { width: 40px; height: 40px; border-radius: 50%; margin-top: 2px; }\n  .msg-body { flex: 1; min-width: 0; }\n  .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 2px; }\n  .author { color: #fff; font-weight: 600; font-size: 15px; }\n  .timestamp { color: #72767d; font-size: 11px; }\n  .bot-badge { background: #5865f2; color: #fff; font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; }\n  .content { color: #dcddde; word-wrap: break-word; }\n  .content a { color: #00aff4; text-decoration: none; }\n  .content a:hover { text-decoration: underline; }\n  .content strong { color: #fff; }\n  .content code.inline { background: #2f3136; padding: 2px 4px; border-radius: 3px; font-size: 13px; }\n  .content pre { background: #2f3136; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; }\n  .content pre code { font-size: 13px; }\n  .mention { background: rgba(88, 101, 242, 0.3); color: #dee0fc; padding: 0 2px; border-radius: 3px; }\n  .embed-badge { background: #4f545c; color: #b9bbbe; font-size: 11px; padding: 2px 6px; border-radius: 3px; margin-top: 4px; display: inline-block; }\n  .attachment { margin: 4px 0; }\n  .attachment img { max-width: 400px; max-height: 300px; border-radius: 4px; }\n  .attachment a { color: #00aff4; }\n  .footer { background: #2f3136; padding: 16px 24px; border-top: 1px solid #202225; text-align: center; color: #72767d; font-size: 12px; }\n</style>\n</head>\n<body>\n  <div class="header">\n    <h1>Ticket #0023</h1>\n    <div class="meta">\n      <span>Servidor: Vapiano's | GTAHUB.GG</span>\n      <span>Canal: mediacion-nooghv_</span>\n      <span>Creado: 3/15/2026, 11:25:05 PM</span>\n      <span>Cerrado: 3/15/2026, 11:26:23 PM</span>\n      <span>Mensajes: 3</span>\n    </div>\n  </div>\n  <div class="messages">\n    \n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:25:05 PM</span>\n          </div>\n          <div class="content"><span class="mention">@1438361558475608148</span></div>\n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:26:07 PM</span>\n          </div>\n          \n          <span class="embed-badge">1 embed(s)</span>\n          \n        </div>\n      </div>\n\n      <div class="message">\n        <div class="avatar"><img src="https://cdn.discordapp.com/avatars/1482419113094811658/a_f220ef35570a4e49bcffc60488b1bf77.gif?size=64" alt=""></div>\n        <div class="msg-body">\n          <div class="msg-header">\n            <span class="author">Vapiano's</span>\n            <span class="bot-badge">BOT</span>\n            <span class="timestamp">3/15/26, 11:26:23 PM</span>\n          </div>\n          \n          \n          \n        </div>\n      </div>\n  </div>\n  <div class="footer">\n    Generado por Vapiano Bot &bull; 3/15/2026, 11:26:23 PM\n  </div>\n</body>\n</html>	2026-03-16 04:26:23.823
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.tickets (id, "guildId", "panelId", "channelId", "userId", number, status, topic, "claimedBy", "closedAt", "createdAt", "addedUsers", "closeReason", "closedBy", feedback, "firstResponse", priority, rating, "lastActivityAt", "reminderAt", "reminderFired", "reminderRoleIds", "reminderMessageId") FROM stdin;
a72c42f4-ae6c-43ae-b7fa-f28639d0ba32	1420045220325625898	d8c6144b-8cb7-49d3-a997-f340363b7898	1482937866790109255	1438361558475608148	7	deleted	\N	\N	2026-03-16 03:33:23.571	2026-03-16 03:05:39.22	{}	\N	1438361558475608148	\N	\N	normal	\N	2026-03-16 03:06:09.335	\N	f	{}	\N
8baeffd1-2868-4d6f-845c-acc93db1502b	1420045220325625898	f08c9ff9-899f-492d-9290-be4399366602	1482947533113262220	1105249076578095134	9	open	\N	\N	\N	2026-03-16 03:44:03.842	{}	\N	\N	\N	\N	normal	\N	2026-03-16 03:44:03.842	\N	f	{}	\N
82812999-eb9a-4eb6-ac00-5294d03e5bb2	1420045220325625898	d8c6144b-8cb7-49d3-a997-f340363b7898	1482948428844630297	1105249076578095134	10	open	\N	1105249076578095134	\N	2026-03-16 03:47:37.381	{}	\N	\N	\N	\N	normal	\N	2026-03-16 03:47:37.381	\N	f	{}	\N
4c954d2c-c379-46c0-a7fe-ac516ec68476	1420045220325625898	d8c6144b-8cb7-49d3-a997-f340363b7898	1482949337909563393	1105249076578095134	11	open	\N	\N	\N	2026-03-16 03:51:14.227	{}	\N	\N	\N	\N	normal	\N	2026-03-16 03:51:14.227	\N	f	{}	\N
bb91754a-c6e3-4e83-bb93-88749d702830	1420045220325625898	f08c9ff9-899f-492d-9290-be4399366602	1482949378204241992	1105249076578095134	12	open	\N	\N	\N	2026-03-16 03:51:23.748	{}	\N	\N	\N	\N	normal	\N	2026-03-16 03:51:23.748	\N	f	{}	\N
6c2f910e-de10-4e18-8208-4b9270a8e2a0	1420045220325625898	d8c6144b-8cb7-49d3-a997-f340363b7898	1482949866077556769	1438361558475608148	13	closed	\N	\N	2026-03-16 03:53:52.007	2026-03-16 03:53:20.143	{}	\N	1438361558475608148	\N	\N	normal	\N	2026-03-16 03:53:20.143	\N	f	{}	\N
d95cbbf0-ee33-4b94-a631-29264dc1891d	1420045220325625898	f08c9ff9-899f-492d-9290-be4399366602	1482950226254762066	1105249076578095134	14	open	\N	\N	\N	2026-03-16 03:54:46.06	{}	\N	\N	\N	\N	normal	\N	2026-03-16 03:54:46.06	\N	f	{}	\N
5aaff859-6a60-4f1e-b308-238581600ae3	1420045220325625898	f08c9ff9-899f-492d-9290-be4399366602	1482950571999629482	1105249076578095134	15	open	\N	\N	\N	2026-03-16 03:56:08.489	{}	\N	\N	\N	\N	normal	\N	2026-03-16 03:56:08.489	\N	f	{}	\N
af82d6f0-9bd5-4143-a779-e6ce9f06a34b	1420045220325625898	f08c9ff9-899f-492d-9290-be4399366602	1482955276335316993	1105249076578095134	19	closed	\N	\N	2026-03-16 04:20:03.796	2026-03-16 04:14:50.049	{}	Verificado	1105249076578095134	\N	\N	normal	\N	2026-03-16 04:14:50.049	\N	f	{}	\N
13f79b24-6ecf-42e6-8fef-45be8704c872	1420045220325625898	\N	1482445030269517967	1438361558475608148	1	closed	\N	\N	2026-03-14 18:27:44.251	2026-03-14 18:27:17.786	{}	\N	\N	\N	\N	normal	\N	2026-03-15 20:57:48.544	\N	f	{}	\N
47b8ecfa-1920-4631-a197-1ceeb800c8fa	1420045220325625898	\N	1482445056760610926	1105249076578095134	2	closed	\N	\N	2026-03-14 18:27:46.47	2026-03-14 18:27:24.147	{}	\N	\N	\N	\N	normal	\N	2026-03-15 20:57:48.544	\N	f	{}	\N
5af59b1b-a4af-4972-ad91-8703fdb99bb5	1420045220325625898	\N	1482497922435252374	1438361558475608148	5	open	\N	1438361558475608148	\N	2026-03-14 21:57:28.314	{}	\N	\N	\N	\N	normal	\N	2026-03-15 20:57:48.544	\N	f	{}	\N
2c434397-66f6-44ed-99be-174010d79588	1420045220325625898	\N	1482497686186889419	1438361558475608148	4	deleted	\N	\N	2026-03-14 21:56:48.96	2026-03-14 21:56:32.082	{}	\N	1438361558475608148	\N	\N	normal	\N	2026-03-15 20:57:48.544	\N	f	{}	\N
ffb7aaa9-b6ac-4bf2-8b6e-61e5c9af3063	1420045220325625898	\N	1482905114048991302	1438361558475608148	6	open	\N	\N	\N	2026-03-16 00:55:30.483	{}	\N	\N	\N	\N	normal	\N	2026-03-16 03:01:29.949	\N	f	{}	\N
4920f123-7a83-4824-9394-d6d705272bec	1420045220325625898	f08c9ff9-899f-492d-9290-be4399366602	1482952987096907796	1105249076578095134	16	closed	\N	\N	2026-03-16 04:20:35.958	2026-03-16 04:05:44.147	{}	verificado	1105249076578095134	\N	\N	normal	\N	2026-03-16 04:06:35.903	\N	f	{}	\N
081ce56c-daa5-4aa0-aa25-da06b32d5d9e	1420045220325625898	d8c6144b-8cb7-49d3-a997-f340363b7898	1482956315419607102	1438361558475608148	22	deleted	\N	\N	2026-03-16 04:19:08.567	2026-03-16 04:18:57.674	{}	\N	1438361558475608148	\N	\N	normal	\N	2026-03-16 04:18:57.674	\N	f	{}	\N
5ee30d73-de84-4e63-98d6-882f41428740	1420045220325625898	f08c9ff9-899f-492d-9290-be4399366602	1482954154396749965	1105249076578095134	17	closed	\N	\N	2026-03-16 04:12:08.719	2026-03-16 04:10:22.619	{}	\N	1105249076578095134	\N	\N	normal	\N	2026-03-16 04:10:22.619	\N	f	{}	\N
e3081d22-7242-49e4-82bb-150848c8d242	1420045220325625898	d8c6144b-8cb7-49d3-a997-f340363b7898	1482944504410542194	1105249076578095134	8	closed	\N	1105249076578095134	2026-03-16 04:13:09.036	2026-03-16 03:32:02.107	{}	\N	1105249076578095134	\N	\N	normal	\N	2026-03-16 03:32:02.107	\N	f	{}	\N
ff852d78-0702-4f64-a162-1f069a893b30	1420045220325625898	1293ce10-a894-4f69-a8e2-b53bfc6889e1	1482955298552418464	1105249076578095134	21	open	\N	\N	\N	2026-03-16 04:14:55.229	{}	\N	\N	\N	\N	normal	\N	2026-03-16 04:18:50.33	\N	f	{}	\N
30e02243-1dbe-44e4-ba3f-214bff54fbb0	1420045220325625898	d8c6144b-8cb7-49d3-a997-f340363b7898	1482955269205131426	1105249076578095134	18	closed	\N	\N	2026-03-16 04:19:43.482	2026-03-16 04:14:48.349	{}	\N	1105249076578095134	\N	\N	normal	\N	2026-03-16 04:14:48.349	\N	f	{}	\N
a6e068c9-2c3f-42de-a8ff-f68e372eb938	1420045220325625898	d8c6144b-8cb7-49d3-a997-f340363b7898	1482957856490786999	1438361558475608148	23	closed	\N	\N	2026-03-16 04:26:23.831	2026-03-16 04:25:05.171	{}	ya	1105249076578095134	\N	\N	normal	\N	2026-03-16 04:25:05.171	\N	f	{}	\N
17e973e7-af77-43e8-bf0f-76e1f04ce890	1420045220325625898	d8c6144b-8cb7-49d3-a997-f340363b7898	1482981940477956198	1105249076578095134	24	open	\N	\N	\N	2026-03-16 06:00:47.217	{}	\N	\N	\N	\N	normal	\N	2026-03-16 06:00:47.217	\N	f	{}	\N
b5c90936-2966-495e-98af-ea821a947b42	1420045220325625898	3a1afdc4-f764-45c0-9a84-6bafeea7a3ac	1482955291686342807	1105249076578095134	20	open	\N	\N	\N	2026-03-16 04:14:53.647	{}	\N	\N	\N	\N	normal	\N	2026-03-16 06:01:19.166	\N	f	{}	\N
\.


--
-- Data for Name: warnings; Type: TABLE DATA; Schema: public; Owner: vapiano
--

COPY public.warnings (id, "guildId", "userId", "moderatorId", reason, "createdAt") FROM stdin;
4ad04270-edf3-43d4-b7f2-2f8a29ea1be4	1420045220325625898	1105249076578095134	1438361558475608148	maricon segundo	2026-03-14 17:22:37.193
27a868da-2734-48a6-9c1a-f4bf17e101ed	1420045220325625898	1438361558475608148	1348480475575881740	veneco  mrkç	2026-03-16 01:34:04.822
\.


--
-- Name: afk_statuses afk_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.afk_statuses
    ADD CONSTRAINT afk_statuses_pkey PRIMARY KEY (id);


--
-- Name: auto_responses auto_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.auto_responses
    ADD CONSTRAINT auto_responses_pkey PRIMARY KEY (id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: giveaways giveaways_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.giveaways
    ADD CONSTRAINT giveaways_pkey PRIMARY KEY (id);


--
-- Name: guild_configs guild_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.guild_configs
    ADD CONSTRAINT guild_configs_pkey PRIMARY KEY (id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: mod_actions mod_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.mod_actions
    ADD CONSTRAINT mod_actions_pkey PRIMARY KEY (id);


--
-- Name: polls polls_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_pkey PRIMARY KEY (id);


--
-- Name: reaction_roles reaction_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.reaction_roles
    ADD CONSTRAINT reaction_roles_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: reputations reputations_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.reputations
    ADD CONSTRAINT reputations_pkey PRIMARY KEY (id);


--
-- Name: scheduled_messages scheduled_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.scheduled_messages
    ADD CONSTRAINT scheduled_messages_pkey PRIMARY KEY (id);


--
-- Name: starboard_entries starboard_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.starboard_entries
    ADD CONSTRAINT starboard_entries_pkey PRIMARY KEY (id);


--
-- Name: sticky_messages sticky_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.sticky_messages
    ADD CONSTRAINT sticky_messages_pkey PRIMARY KEY (id);


--
-- Name: suggestions suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.suggestions
    ADD CONSTRAINT suggestions_pkey PRIMARY KEY (id);


--
-- Name: ticket_panels ticket_panels_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.ticket_panels
    ADD CONSTRAINT ticket_panels_pkey PRIMARY KEY (id);


--
-- Name: ticket_transcripts ticket_transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.ticket_transcripts
    ADD CONSTRAINT ticket_transcripts_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: warnings warnings_pkey; Type: CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.warnings
    ADD CONSTRAINT warnings_pkey PRIMARY KEY (id);


--
-- Name: afk_statuses_guildId_userId_key; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE UNIQUE INDEX "afk_statuses_guildId_userId_key" ON public.afk_statuses USING btree ("guildId", "userId");


--
-- Name: auto_responses_guildId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "auto_responses_guildId_idx" ON public.auto_responses USING btree ("guildId");


--
-- Name: backups_guildId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "backups_guildId_idx" ON public.backups USING btree ("guildId");


--
-- Name: giveaways_endsAt_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "giveaways_endsAt_idx" ON public.giveaways USING btree ("endsAt");


--
-- Name: giveaways_guildId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "giveaways_guildId_idx" ON public.giveaways USING btree ("guildId");


--
-- Name: invites_guildId_invitedId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "invites_guildId_invitedId_idx" ON public.invites USING btree ("guildId", "invitedId");


--
-- Name: invites_guildId_inviterId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "invites_guildId_inviterId_idx" ON public.invites USING btree ("guildId", "inviterId");


--
-- Name: mod_actions_expiresAt_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "mod_actions_expiresAt_idx" ON public.mod_actions USING btree ("expiresAt");


--
-- Name: mod_actions_guildId_userId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "mod_actions_guildId_userId_idx" ON public.mod_actions USING btree ("guildId", "userId");


--
-- Name: reaction_roles_messageId_emoji_key; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE UNIQUE INDEX "reaction_roles_messageId_emoji_key" ON public.reaction_roles USING btree ("messageId", emoji);


--
-- Name: reminders_remindAt_fired_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "reminders_remindAt_fired_idx" ON public.reminders USING btree ("remindAt", fired);


--
-- Name: reminders_userId_guildId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "reminders_userId_guildId_idx" ON public.reminders USING btree ("userId", "guildId");


--
-- Name: reputations_guildId_giverId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "reputations_guildId_giverId_idx" ON public.reputations USING btree ("guildId", "giverId");


--
-- Name: reputations_guildId_userId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "reputations_guildId_userId_idx" ON public.reputations USING btree ("guildId", "userId");


--
-- Name: scheduled_messages_guildId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "scheduled_messages_guildId_idx" ON public.scheduled_messages USING btree ("guildId");


--
-- Name: starboard_entries_guildId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "starboard_entries_guildId_idx" ON public.starboard_entries USING btree ("guildId");


--
-- Name: starboard_entries_guildId_originalMsgId_key; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE UNIQUE INDEX "starboard_entries_guildId_originalMsgId_key" ON public.starboard_entries USING btree ("guildId", "originalMsgId");


--
-- Name: sticky_messages_channelId_key; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE UNIQUE INDEX "sticky_messages_channelId_key" ON public.sticky_messages USING btree ("channelId");


--
-- Name: sticky_messages_guildId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "sticky_messages_guildId_idx" ON public.sticky_messages USING btree ("guildId");


--
-- Name: suggestions_guildId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "suggestions_guildId_idx" ON public.suggestions USING btree ("guildId");


--
-- Name: suggestions_guildId_status_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "suggestions_guildId_status_idx" ON public.suggestions USING btree ("guildId", status);


--
-- Name: ticket_transcripts_guildId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "ticket_transcripts_guildId_idx" ON public.ticket_transcripts USING btree ("guildId");


--
-- Name: ticket_transcripts_ticketId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "ticket_transcripts_ticketId_idx" ON public.ticket_transcripts USING btree ("ticketId");


--
-- Name: tickets_channelId_key; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE UNIQUE INDEX "tickets_channelId_key" ON public.tickets USING btree ("channelId");


--
-- Name: tickets_guildId_status_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "tickets_guildId_status_idx" ON public.tickets USING btree ("guildId", status);


--
-- Name: tickets_guildId_userId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "tickets_guildId_userId_idx" ON public.tickets USING btree ("guildId", "userId");


--
-- Name: warnings_guildId_userId_idx; Type: INDEX; Schema: public; Owner: vapiano
--

CREATE INDEX "warnings_guildId_userId_idx" ON public.warnings USING btree ("guildId", "userId");


--
-- Name: afk_statuses afk_statuses_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.afk_statuses
    ADD CONSTRAINT "afk_statuses_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auto_responses auto_responses_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.auto_responses
    ADD CONSTRAINT "auto_responses_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: backups backups_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT "backups_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: giveaways giveaways_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.giveaways
    ADD CONSTRAINT "giveaways_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invites invites_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT "invites_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mod_actions mod_actions_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.mod_actions
    ADD CONSTRAINT "mod_actions_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: polls polls_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT "polls_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reaction_roles reaction_roles_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.reaction_roles
    ADD CONSTRAINT "reaction_roles_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reputations reputations_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.reputations
    ADD CONSTRAINT "reputations_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scheduled_messages scheduled_messages_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.scheduled_messages
    ADD CONSTRAINT "scheduled_messages_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: starboard_entries starboard_entries_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.starboard_entries
    ADD CONSTRAINT "starboard_entries_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sticky_messages sticky_messages_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.sticky_messages
    ADD CONSTRAINT "sticky_messages_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: suggestions suggestions_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.suggestions
    ADD CONSTRAINT "suggestions_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_panels ticket_panels_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.ticket_panels
    ADD CONSTRAINT "ticket_panels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_transcripts ticket_transcripts_panelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.ticket_transcripts
    ADD CONSTRAINT "ticket_transcripts_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES public.ticket_panels(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ticket_transcripts ticket_transcripts_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.ticket_transcripts
    ADD CONSTRAINT "ticket_transcripts_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tickets tickets_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tickets tickets_panelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES public.ticket_panels(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: warnings warnings_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vapiano
--

ALTER TABLE ONLY public.warnings
    ADD CONSTRAINT "warnings_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public.guild_configs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict PaPfWGvscQYgo10tE5siF9nXzPHlKMpiUcPwJc9yhfNcY6EsSuBvkgBfqWYKPU4

