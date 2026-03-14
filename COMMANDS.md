# Vapiano Bot — Command Reference

All commands use Discord slash commands (`/`).

---

## /config — Server Configuration

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/config module enable <module>` | Enable a module | `/config module enable leveling` |
| `/config module disable <module>` | Disable a module | `/config module disable automod` |
| `/config module status` | Show all module statuses | `/config module status` |
| `/config set welcome <channel>` | Set welcome message channel | `/config set welcome #welcome` |
| `/config set farewell <channel>` | Set farewell message channel | `/config set farewell #goodbye` |
| `/config set modlog <channel>` | Set moderation log channel | `/config set modlog #mod-logs` |
| `/config set messagelog <channel>` | Set message edit/delete log channel | `/config set messagelog #msg-logs` |
| `/config set joinleavelog <channel>` | Set join/leave log channel | `/config set joinleavelog #join-logs` |
| `/config set levelup <channel>` | Set level-up notification channel | `/config set levelup #level-ups` |
| `/config set joinrole <role>` | Set auto-assign role on join | `/config set joinrole @Member` |
| `/config set muterole <role>` | Set the mute role | `/config set muterole @Muted` |
| `/config automod antispam <max> <interval>` | Configure anti-spam filter | `/config automod antispam 5 5` |
| `/config automod anticaps <percent> <minlength>` | Configure anti-caps filter | `/config automod anticaps 70 10` |
| `/config automod antilinks <enable/disable>` | Toggle anti-links filter | `/config automod antilinks enable` |
| `/config automod blacklist add <word>` | Add a blacklisted word | `/config automod blacklist add badword` |
| `/config automod blacklist remove <word>` | Remove a blacklisted word | `/config automod blacklist remove badword` |
| `/config automod exempt <role>` | Exempt a role from automod | `/config automod exempt @Staff` |

---

## /invites — Invite Tracking

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/invites info [user]` | View invite stats for a user | `/invites info @JohnDoe` |
| `/invites leaderboard` | Show invite leaderboard | `/invites leaderboard` |
| `/invites who <user>` | See who invited a user | `/invites who @JohnDoe` |
| `/invites reset [user]` | Reset invite counts | `/invites reset @JohnDoe` |

---

## /backup — Server Backups

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/backup create [name]` | Create a server backup | `/backup create before-update` |
| `/backup list` | List all backups | `/backup list` |
| `/backup info <id>` | View backup details | `/backup info abc123` |
| `/backup restore <id>` | Restore a backup | `/backup restore abc123` |
| `/backup delete <id>` | Delete a backup | `/backup delete abc123` |

---

## /level — Leveling System

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/level rank [user]` | View XP rank and level | `/level rank @JohnDoe` |
| `/level leaderboard` | Show XP leaderboard | `/level leaderboard` |
| `/level setxp <user> <amount>` | Set a user's XP | `/level setxp @JohnDoe 5000` |
| `/level setlevel <user> <level>` | Set a user's level | `/level setlevel @JohnDoe 10` |
| `/level reward <level> <role>` | Add a level-up role reward | `/level reward 10 @VIP` |
| `/level rewards` | List all level rewards | `/level rewards` |
| `/level removereward <level>` | Remove a level reward | `/level removereward 10` |

---

## /mod — Moderation

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/mod warn <user> [reason]` | Warn a user | `/mod warn @JohnDoe Spamming` |
| `/mod warnings <user>` | View a user's warnings | `/mod warnings @JohnDoe` |
| `/mod clearwarnings <user>` | Clear all warnings | `/mod clearwarnings @JohnDoe` |
| `/mod mute <user> [reason]` | Mute a user (indefinite) | `/mod mute @JohnDoe Disruptive` |
| `/mod unmute <user>` | Unmute a user | `/mod unmute @JohnDoe` |
| `/mod kick <user> [reason]` | Kick a user | `/mod kick @JohnDoe Rule violation` |
| `/mod ban <user> [reason]` | Ban a user permanently | `/mod ban @JohnDoe Toxic behavior` |
| `/mod tempban <user> <duration> [reason]` | Temporary ban | `/mod tempban @JohnDoe 7d Cooldown` |
| `/mod unban <user_id>` | Unban a user by ID | `/mod unban 123456789` |
| `/mod clear <amount> [user]` | Bulk delete messages | `/mod clear 50 @JohnDoe` |
| `/mod lock [channel]` | Lock a channel | `/mod lock #general` |
| `/mod unlock [channel]` | Unlock a channel | `/mod unlock #general` |
| `/mod history <user>` | View full mod history | `/mod history @JohnDoe` |

---

## /reactionrole — Reaction Roles

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/reactionrole create <channel> <title> <description>` | Create a reaction role panel | `/reactionrole create #roles Pick your roles` |
| `/reactionrole add <message_id> <emoji> <role>` | Add a role to a panel | `/reactionrole add 123456 :star: @StarRole` |
| `/reactionrole remove <message_id> <emoji>` | Remove a role from a panel | `/reactionrole remove 123456 :star:` |
| `/reactionrole list` | List all reaction role panels | `/reactionrole list` |

---

## /autoresponse — Auto-Responses

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/autoresponse add <trigger> <response> [mode]` | Add an auto-response | `/autoresponse add hello Hey there!` |
| `/autoresponse list` | List all auto-responses | `/autoresponse list` |
| `/autoresponse remove <id>` | Remove an auto-response | `/autoresponse remove abc123` |
| `/autoresponse toggle <id>` | Enable/disable a response | `/autoresponse toggle abc123` |

Match modes: `contains` (default), `exact`, `startsWith`

---

## /schedule — Scheduled Messages

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/schedule add <channel> <cron> <message>` | Add a scheduled message | `/schedule add #general "0 9 * * *" Good morning!` |
| `/schedule list` | List all scheduled messages | `/schedule list` |
| `/schedule remove <id>` | Remove a scheduled message | `/schedule remove abc123` |
| `/schedule toggle <id>` | Enable/disable a schedule | `/schedule toggle abc123` |

Cron format: `minute hour day month weekday`
- `0 9 * * *` = every day at 9 AM
- `0 9 * * 1-5` = weekdays at 9 AM
- `*/30 * * * *` = every 30 minutes

---

## /poll — Polls

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/poll create <question> <options>` | Create a poll (comma-separated options) | `/poll create "Favorite color?" Red,Blue,Green` |
| `/poll end <message_id>` | End a poll and show results | `/poll end 123456789` |

---

## /ticket — Ticket System

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/ticket panel <channel> <category> [title] [description]` | Create a ticket panel | `/ticket panel #support 12345 Support` |
| `/ticket close [reason]` | Close the current ticket | `/ticket close Resolved` |
| `/ticket reopen` | Reopen a closed ticket | `/ticket reopen` |
| `/ticket delete` | Permanently delete a ticket | `/ticket delete` |
| `/ticket transcript` | Generate a transcript | `/ticket transcript` |
| `/ticket add <user>` | Add a user to the ticket | `/ticket add @JohnDoe` |
| `/ticket remove <user>` | Remove a user from the ticket | `/ticket remove @JohnDoe` |
| `/ticket claim` | Claim the ticket as a staff member | `/ticket claim` |

---

## Duration Format

For `/mod tempban` and similar commands, durations use this format:
- `30s` = 30 seconds
- `10m` = 10 minutes
- `2h` = 2 hours
- `7d` = 7 days
- `1w` = 1 week

---

## Template Variables

Available in welcome/farewell messages:
- `{user}` — Mention the user
- `{username}` — Username (text only)
- `{server}` — Server name
- `{memberCount}` — Current member count
- `{inviter}` — Mention of who invited the user
- `{inviteCount}` — Number of invites the inviter has
