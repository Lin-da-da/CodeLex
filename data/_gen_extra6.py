import json

def art(slug, title, difficulty, category, md_paras, cn_paras, title_cn):
    assert len(md_paras) == len(cn_paras), (slug, len(md_paras), len(cn_paras))
    return {
        "slug": slug,
        "stackSlug": "java",
        "title": title,
        "difficulty": difficulty,
        "category": category,
        "contentMd": "\n\n".join(md_paras),
        "contentCn": "\n\n".join(cn_paras),
        "titleEn": title,
        "titleCn": title_cn,
        "license": "original",
    }

arts = []

arts.append(art(
    "java-redis-data-structures",
    "Redis Data Structures for Backend Developers",
    2, "basics",
    [
        "Redis is often described as a \"data structures server\" because, unlike a simple key-value store, it exposes rich, first-class data types that map naturally onto real problems. The five core types are strings, lists, sets, sorted sets (zsets), and hashes. Each type comes with its own dedicated command set and time-complexity guarantees, which is why choosing the right type is a frequent interview theme.",
        "Strings are the simplest and can hold text, JSON, or raw bytes up to 512 MB; they are ideal for counters (INCR) and caches. Hashes group related fields under one key and are perfect for representing objects such as user profiles without serializing the whole thing. Lists are ordered, allow push and pop from both ends, and back queues and timelines. Sets provide uniqueness and fast membership tests, while sorted sets add a score that keeps elements ordered, enabling leaderboards and delayed queues via ZADD and ZRANGEBYSCORE.",
        "In interviews, the key is to justify your choice with trade-offs. For example, storing a session object as a hash lets you update single fields cheaply, whereas a serialized string forces a full rewrite. Knowing when to reach for a sorted set versus a list, or a set versus a hash with set-like tricks, shows you understand Redis as more than a cache: it is an in-memory data-modeling tool.",
    ],
    [
        "Redis 常被形容为“数据结构服务器”，因为与简单的键值存储不同，它提供了一等公民级别的丰富数据类型，能够自然地映射到真实问题。五种核心类型是字符串、列表、集合、有序集合（zset）和哈希。每种类型都有自己专属的命令集与时间复杂度保证，因此“选对类型”经常成为面试考点。",
        "字符串最为简单，可存储文本、JSON 或原始字节，上限 512 MB，非常适合做计数（INCR）和缓存。哈希将相关字段聚合在一个键下，适合表示用户资料等对象而无需整体序列化。列表是有序的，支持两端压入与弹出，可支撑队列和时间线。集合保证唯一性并提供快速成员判定；而有序集合增加了一个分值来保持元素有序，借助 ZADD 与 ZRANGEBYSCORE 可实现排行榜和延迟队列。",
        "在面试中，关键在于用权衡来论证你的选择。例如，把会话对象存为哈希，可以廉价地更新单个字段，而序列化成字符串则必须整体重写。懂得何时选用有序集合而非列表、何时用集合而非借助哈希模拟集合，说明你理解 Redis 不只是缓存，更是内存中的数据建模工具。",
    ],
    "Redis 后端开发必备的数据结构",
))

arts.append(art(
    "java-redis-cache-penetration",
    "Preventing Redis Cache Penetration",
    3, "pitfalls",
    [
        "Cache penetration happens when a request asks for data that does not exist, neither in the cache nor in the database. Because the key is missing, the cache is never populated, so every such request falls straight through to the database. If an attacker deliberately queries random non-existent IDs, the database is hammered and can be taken down even though your cache is working perfectly.",
        "The standard fix is to cache the empty result. When the database returns nothing for a key, still write a short-lived placeholder (such as NULL or a special marker) into Redis with a small TTL. Subsequent requests for the same missing key hit the cache and return immediately, protecting the database. Use a short TTL and a distinct value so you do not accidentally cache a real empty state forever.",
        "A stronger defense is a bloom filter. Before querying, check the bloom filter, which can tell you with certainty that a key does not exist, or probably exists. Requests for definitely-missing keys are rejected at the edge, so they never reach Redis or the database. Combining a bloom filter (to block impossible keys) with empty-result caching (to handle rare genuinely-missing keys) gives robust protection against penetration.",
    ],
    [
        "缓存穿透发生在请求的数据根本不存在时——缓存和数据库里都没有。由于键缺失，缓存永远不会被填充，因此每个这样的请求都会直接穿透到数据库。如果攻击者故意查询随机的不存在 ID，数据库就会被反复打垮，即便你的缓存工作正常也无济于事。",
        "标准解法是缓存“空”结果。当数据库对某个键返回空时，仍然往 Redis 写入一个短生命周期的占位值（如 NULL 或特殊标记）并设置较小的 TTL。后续对同一缺失键的请求命中缓存后立即返回，从而保护数据库。注意不要使用过长的 TTL，并采用可辨识的空值，以免把真正的空状态永久缓存。",
        "更强的防御是布隆过滤器。查询前先经过布隆过滤器，它能在确定意义上告诉你某个键“一定不存在”或“可能存在”。对确定不存在的键在边缘直接拒绝，使其永远到不了 Redis 或数据库。将布隆过滤器（拦截不可能存在的键）与空结果缓存（处理偶发真实缺失的键）结合，可形成对穿透的稳健防护。",
    ],
    "Redis 缓存穿透的防范",
))

arts.append(art(
    "java-redis-cache-breakdown",
    "Handling Redis Cache Breakdown (Hot-Key Expiry)",
    3, "pitfalls",
    [
        "Cache breakdown, also called hot-key breakdown, refers to a single, extremely hot key expiring at a moment when it is under heavy concurrent access. Unlike avalanche, which affects many keys at once, breakdown is about one popular key: when it vanishes from cache, a huge number of requests simultaneously fall through to the database to rebuild it, creating a momentary spike that can stagger the database.",
        "The simplest mitigation is to never let the hot key expire, or to refresh it proactively in the background before expiry. A more general approach is mutual exclusion: when the cache misses, use a distributed lock (or Redis SETNX) so that only one thread queries the database and repopulates the cache; all other threads wait briefly and then read from the freshly filled cache. This prevents the thundering herd.",
        "A variation is the logical-expiry pattern: store the value together with an expiry timestamp inside the data, but keep the physical key alive indefinitely. When a reader sees the logical TTL has passed, it triggers an async rebuild while still returning the stale value to the caller. This keeps response times stable and avoids spikes, at the cost of serving slightly stale data for a short window.",
    ],
    [
        "缓存击穿（也称“热点 key 击穿”）指的是某一个极热的 key 在遭受高并发访问的瞬间过期。与一次影响大量 key 的雪崩不同，击穿聚焦在单个热点 key：当它从缓存消失时，大量请求同时穿透到数据库去重建它，形成一次可能压垮数据库的瞬时尖峰。",
        "最简单的缓解措施是让热点 key 永不过期，或在过期前由后台主动刷新。更通用的做法是互斥：当缓存未命中时，使用分布式锁（或 Redis 的 SETNX），只允许一个线程去查询数据库并回填缓存；其余线程短暂等待后直接从刚填充好的缓存读取。这样可以避免惊群效应。",
        "另一种变体是逻辑过期模式：将数据与过期时间戳一起存储，但让物理 key 永久存活。当读取者发现逻辑 TTL 已过期，会触发一次异步重建，同时仍向调用方返回旧值。这保证了响应时间的稳定、避免尖峰，代价是在一小段时间内可能返回略微过时的数据。",
    ],
    "Redis 缓存击穿（热点 Key 过期）的应对",
))

arts.append(art(
    "java-redis-cache-avalanche",
    "Surviving a Redis Cache Avalanche",
    3, "pitfalls",
    [
        "Cache avalanche describes a scenario where a large number of keys expire at roughly the same time, or the cache service itself goes down, causing a massive wave of traffic to hit the database at once. With many queries missing simultaneously, the database can be overwhelmed and may cascade into a full outage. The name comes from the avalanche of requests that buries the backend.",
        "A common cause is setting identical TTLs on many cached items, so they all expire together. The fix is to add random jitter to expiry times, for example a base TTL plus a random few minutes, so keys drift apart and do not die in unison. For critical data, consider a longer or effectively never-expire policy combined with active refresh.",
        "Beyond expiry, avalanche also means cache unavailability. Mitigations include running Redis in a highly available topology (sentinel or cluster), adding a local in-process cache as a second layer, and protecting the database with rate limiting or circuit breakers so a cache failure degrades gracefully instead of collapsing the whole system.",
    ],
    [
        "缓存雪崩描述的是这样一种场景：大量 key 在同一时刻集中过期，或者缓存服务本身宕机，导致海量流量瞬间涌向数据库。由于大量查询同时未命中，数据库可能被压垮，并进一步级联成全面故障。其名称正源于那股“雪崩”般的请求将后端掩埋。",
        "常见诱因是给大量缓存项设置了相同的 TTL，使它们一起过期。修复办法是给过期时间加上随机抖动——例如基础 TTL 再加上几分钟的随机值——让 key 的过期时间错开，避免集体阵亡。对于关键数据，可结合主动刷新，采用更长或实质上“永不过期”的策略。",
        "除了过期，雪崩也指缓存不可用。缓解手段包括将 Redis 部署为高可用拓扑（哨兵或集群），增加一层本地进程内缓存作为第二道防线，并用限流或熔断保护数据库，使得缓存故障时系统能优雅降级，而非整体崩塌。",
    ],
    "Redis 缓存雪崩的应对",
))

arts.append(art(
    "java-redis-cache-consistency",
    "Achieving Cache-Database Consistency",
    4, "architecture",
    [
        "Cache consistency is the problem of keeping the cached copy and the database in agreement after writes. The two operations, updating Redis and updating the DB, are not atomic, so ordering and failure handling matter. A well-known wrong pattern is delete-cache-then-update-DB combined with a concurrent read that repopulates stale data; the reverse order has its own race conditions too.",
        "The most recommended approach for reads is the Cache-Aside pattern: on a write, update the database first, then delete the cache (or let it expire). Deleting rather than updating the cache avoids the hard problem of keeping two writes perfectly ordered, and the next read rebuilds the correct value. To reduce the window where a stale value is read, some systems use a short delay or a binlog-driven (Canal) asynchronous deletion.",
        "There is no perfect single answer; trade-offs depend on whether you can tolerate brief staleness. Many production systems accept eventual consistency with a small TTL as a safety net: even if a deletion is missed, the entry expires automatically. For stronger guarantees, dual-write with transactions or an outbox pattern can help, but they add significant complexity.",
    ],
    [
        "缓存一致性指的是写入之后，如何让缓存副本与数据库保持一致的问题。更新 Redis 与更新数据库这两个操作并非原子性的，因此顺序与失败处理都至关重要。一个广为人知的反模式是“先删缓存再更新数据库”，这会导致并发读把旧数据重新填回缓存；反过来操作同样存在竞态。",
        "读多写少场景下最推荐的是 Cache-Aside 模式：写入时先更新数据库，再删除缓存（或让其过期）。删除而非更新缓存，规避了“让两次写入严格保序”这一难题，下一次读取会重建正确的值。为缩小读到旧值的时间窗，一些系统引入了短暂延迟，或使用基于 binlog（如 Canal）的异步删除。",
        "并不存在完美的单一答案，取舍取决于你能容忍多长时间的旧数据。许多生产系统接受“最终一致性”并以较短的 TTL 作为兜底：即便删除被遗漏，条目也会自动过期。若需要更强保证，双写加事务或 Outbox 模式可以帮忙，但会显著增加复杂度。",
    ],
    "缓存与数据库的一致性",
))

arts.append(art(
    "java-redis-cache-aside",
    "The Cache-Aside Pattern Explained",
    3, "practice",
    [
        "The Cache-Aside pattern, sometimes called Lazy Loading, is the most common caching strategy in Java backends. On a read, the application first looks in the cache; on a miss it loads from the database, writes the result back into the cache, and returns it. This keeps the cache populated only with data that is actually requested, avoiding wasteful preloading.",
        "On a write, the standard sequence is write to database, then delete (or update) the cache. Updating the cache on every write can be expensive and can introduce consistency races, so many teams prefer to simply invalidate the cache entry and let the next read repopulate it. This trades a cache miss for correctness and simplicity.",
        "The trade-off is a possible stale read right after a write, because the delete and a concurrent read are not perfectly synchronized. Cache-Aside works best when the data changes less often than it is read, and when brief staleness is acceptable. Pair it with a reasonable TTL so that even missed invalidations self-heal, and you get a robust, low-complexity caching layer.",
    ],
    [
        "Cache-Aside 模式（有时也叫懒加载）是 Java 后端中最常用的缓存策略。读取时，应用先查缓存；未命中时再从数据库加载，将结果写回缓存后返回。这样缓存只填充真正被请求的数据，避免了无谓的预加载。",
        "写入时，标准顺序是“先写数据库，再删除（或更新）缓存”。在每次写入时都更新缓存可能代价高昂且会带来一致性竞态，因此许多团队更倾向简单地让缓存条目失效，交由下一次读取来重新填充。这用一次缓存未命中换来了正确性与简洁性。",
        "其权衡在于：写入之后可能存在短暂的旧数据读取，因为删除操作与并发读取无法完美同步。Cache-Aside 在“数据被读的频率高于被改的频率”且能容忍短暂陈旧时效果最佳。再配合一个合理的 TTL，即便失效被遗漏也能自愈，从而得到一层健壮且低复杂度的缓存。",
    ],
    "Cache-Aside 模式详解",
))

arts.append(art(
    "java-redis-distributed-lock",
    "Implementing a Redis Distributed Lock",
    4, "concurrency",
    [
        "A Redis distributed lock lets multiple application nodes coordinate exclusive access to a shared resource, such as deducting inventory or processing a job exactly once. The naive approach, SETNX key value, claims a lock only if the key does not exist, but it lacks an automatic expiry, so a crashed holder can deadlock the system forever.",
        "The safe pattern is SET key value NX PX milliseconds, which atomically sets the lock only if absent and attaches a TTL in one command. The holder must release the lock only if it still owns it, which requires checking the value (a unique token per caller) inside a Lua script so the check-and-delete is atomic. Releasing a lock you no longer own would free someone else's lock.",
        "For correctness under clock skew and partial failures, Redis recommends the Redlock algorithm, though it remains debated. In practice, many teams use a mature client library such as Redisson that provides lock renewal (watchdog), reentrancy, and fair queuing out of the box. Keep the critical section small and the lock TTL short to reduce the blast radius of any failure.",
    ],
    [
        "Redis 分布式锁让多个应用节点能够协调对共享资源的独占访问，例如扣减库存或保证任务只被执行一次。朴素做法是 SETNX key value，只在键不存在时才抢到锁，但它缺少自动过期，因此持有者一旦崩溃就可能让系统永久死锁。",
        "安全的模式是 SET key value NX PX 毫秒，它在单条命令中原子地“仅当不存在时才设置”并附带 TTL。持有者必须且只能在仍拥有该锁时释放它，这需要在 Lua 脚本中校验值（每个调用方一个唯一令牌），使“校验加删除”成为原子操作。释放一个你已不再拥有的锁，等于放掉了别人的锁。",
        "为了在时钟偏移和部分故障下保证正确性，Redis 官方推荐 Redlock 算法，尽管它仍有争议。实践中，许多团队直接使用成熟的客户端库（如 Redisson），它开箱即用地提供了锁续期（看门狗）、可重入性和公平排队。务必让临界区尽可能小、锁 TTL 尽可能短，以降低任何故障的波及范围。",
    ],
    "Redis 分布式锁的实现",
))

arts.append(art(
    "java-redis-persistence",
    "Redis Persistence: RDB vs AOF",
    3, "internals",
    [
        "Redis is an in-memory store, so persistence determines how much data survives a restart. It offers two mechanisms: RDB (Redis Database) and AOF (Append Only File). RDB snapshots the dataset to a compressed binary file at configured intervals (for example save 900 1), making it compact and fast to reload, but any data written after the last snapshot can be lost.",
        "AOF logs every write command to a file and replays it on restart, giving much stronger durability, down to near-zero data loss if configured with everysec fsync. The cost is a larger file and slower recovery, since Redis must replay commands. AOF files are also compacted over time through rewriting to keep them manageable.",
        "Modern Redis lets you combine both: use RDB for fast point-in-time backups and AOF for durability, which has been the default in recent versions. Understanding the trade-off, RDB for speed and size, AOF for safety, helps you choose a persistence strategy that matches your tolerance for data loss versus your recovery-time and disk-space budget.",
    ],
    [
        "Redis 是内存存储，因此持久化决定了重启时能保留多少数据。它提供两种机制：RDB（Redis Database）与 AOF（Append Only File）。RDB 按配置间隔（如 save 900 1）将数据集快照为压缩的二进制文件，体积紧凑、重载迅速，但最后一次快照之后写入的数据可能丢失。",
        "AOF 将每一条写命令记录到文件中，重启时重放，从而提供强得多的持久性——若配置为 everysec 刷盘，数据丢失可降到近乎为零。代价是文件更大、恢复更慢，因为 Redis 必须重放命令。AOF 文件也会通过重写（rewrite）定期压缩，以保持可控。",
        "现代 Redis 允许两者结合：用 RDB 做快速的时间点备份，用 AOF 保证持久性，这也是近几个版本的默认设置。理解其权衡——RDB 侧重速度与体积，AOF 侧重安全——有助于你根据自身对数据丢失的容忍度、恢复时间与磁盘空间的预算来选择合适的持久化策略。",
    ],
    "Redis 持久化：RDB 与 AOF",
))

arts.append(art(
    "java-redis-expiration-eviction",
    "Redis Key Expiration and Eviction Policies",
    4, "internals",
    [
        "Redis lets every key carry a TTL, but expiry is lazy and cooperative: a key is deleted only when accessed (lazy expiration) or periodically sampled by a background process (active expiration). This means an expired key may linger in memory until Redis happens to check it, which is usually fine but matters when memory is tight.",
        "When memory reaches the maxmemory limit, Redis applies an eviction policy to make room. The default, noeviction, rejects writes instead of deleting data. Other policies include allkeys-lru and volatile-lru (least-recently-used), allkeys-lfu and volatile-lfu (least-frequently-used), and allkeys-random and volatile-random. The volatile variants only touch keys that have a TTL set.",
        "Choosing the right policy is an interview favorite because it directly affects cache hit rate and data safety. For a pure cache where any key can be dropped, allkeys-lru is a sensible default. For mixed use where only TTL'd keys should be evicted, volatile-lru protects permanent data. Pair the policy with a sane maxmemory and TTL strategy so the cache degrades predictably under load.",
    ],
    [
        "Redis 允许每个 key 都带 TTL，但过期是惰性且协作式的：一个 key 只有在被访问时（惰性过期）或被后台进程周期性采样时（主动过期）才会被删除。这意味着过期的 key 可能一直驻留内存，直到 Redis 恰好检查到它——这通常没问题，但在内存紧张时就很关键。",
        "当内存达到 maxmemory 上限时，Redis 会应用淘汰策略来腾出空间。默认策略 noeviction 会拒绝写入而不是删除数据。其他策略包括 allkeys-lru 与 volatile-lru（最近最少使用）、allkeys-lfu 与 volatile-lfu（最不经常使用），以及 allkeys-random 与 volatile-random。volatile 系列只淘汰设置了 TTL 的 key。",
        "选择正确的淘汰策略是面试常客，因为它直接影响缓存命中率与数据安全。对于“任何 key 都可被丢弃”的纯缓存，allkeys-lru 是稳妥的默认选择。对于混合用途、只有带 TTL 的 key 才应被淘汰的场景，volatile-lru 能保护永久数据。将策略与合理的 maxmemory 和 TTL 策略配合使用，缓存便能在压力下可预期地降级。",
    ],
    "Redis 键过期与淘汰策略",
))

arts.append(art(
    "java-redis-cluster",
    "Redis Cluster and Sharding",
    4, "architecture",
    [
        "As a dataset grows beyond one node's memory, Redis uses sharding to spread keys across multiple nodes. Redis Cluster is the official solution: it partitions keys into 16384 hash slots, and each node owns a subset of those slots. A key's slot is computed as CRC16(key) mod 16384, so any node can route a request to the correct owner.",
        "Redis Cluster is decentralized and uses gossip for node discovery and failover. It supports master-replica replication per shard for high availability, and clients are expected to be cluster-aware, caching slot mappings and following MOVED and ASK redirects. Because slots are the unit of distribution, multi-key operations must involve keys in the same slot (using hash tags like {user1}) to work correctly.",
        "The main caveats are operational complexity and limited cross-slot transactions. When a cluster is resharding, some keys migrate and clients may see temporary redirects. Compared with a single instance or a simple proxy-based sharding, Redis Cluster trades simplicity for horizontal scalability, an essential capability once your working set outgrows one machine.",
    ],
    [
        "当数据集增长到超出单节点内存时，Redis 通过分片把 key 分散到多个节点。Redis Cluster 是官方方案：它将 key 划分到 16384 个哈希槽中，每个节点负责其中一部分槽。某个 key 的槽位由 CRC16(key) mod 16384 计算，因此任意节点都能把请求路由到正确的持有者。",
        "Redis Cluster 是去中心化的，使用 gossip 协议进行节点发现与故障转移。它为每个分片提供主从复制以实现高可用，并要求客户端具备集群感知能力——缓存槽位映射并跟随 MOVED 与 ASK 重定向。由于槽位是分布的单位，多 key 操作必须保证相关 key 落在同一槽位（使用 {user1} 这类哈希标签）才能正确执行。",
        "主要注意事项是运维复杂度以及受限的跨槽事务。在集群重分片时，部分 key 会迁移，客户端可能遇到临时重定向。与单实例或简单的基于代理的分片相比，Redis Cluster 用复杂度换取了水平扩展能力——一旦你的工作集超出单台机器，这便成为必不可少的能力。",
    ],
    "Redis Cluster 与分片",
))

arts.append(art(
    "java-mq-concepts",
    "Message Queue Core Concepts",
    2, "basics",
    [
        "A message queue (MQ) is an asynchronous communication mechanism where producers send messages to a broker and consumers process them independently. This decouples services, smooths traffic spikes (peak shaving), and improves resilience: if a consumer is slow or down, messages simply queue up instead of failing the caller.",
        "The core vocabulary includes topics or exchanges (where messages are published), queues (where they wait), producers, and consumers. Messages are typically acknowledged after successful processing; if a consumer fails, the broker can redeliver. Delivery semantics range from at-most-once to at-least-once and the stronger but harder exactly-once.",
        "Common usage patterns are work queues for distributing tasks, pub/sub for broadcasting events, and event streaming for ordered, replayable logs. Interviewers look for your understanding of when an MQ helps, namely decoupling, buffering, and reliability, and when it adds needless complexity. A good answer weighs latency, ordering, and delivery guarantees against the operational cost of running a broker.",
    ],
    [
        "消息队列（MQ）是一种异步通信机制：生产者把消息发送到消息中间件，消费者再独立地处理它们。它解耦了服务、削平了流量高峰（削峰），并提升了韧性——即便消费者缓慢或宕机，消息也只是排队等待，而不会让调用方失败。",
        "核心术语包括主题或交换机（消息发布处）、队列（消息等待处）、生产者和消费者。消息通常在处理成功后被确认（ack）；若消费者失败，中间件可重新投递。投递语义从“最多一次”到“至少一次”，再到更强但也更难实现的“恰好一次”。",
        "常见使用模式有：用于分发任务的工作队列、用于广播事件的发布订阅，以及用于有序且可重放日志的事件流。面试官看重你是否理解 MQ 何时有益——解耦、缓冲与可靠性——以及何时只会增加无谓的复杂度。好的回答会把延迟、顺序性和投递保证，与运行中间件的运维成本放在一起权衡。",
    ],
    "消息队列核心概念",
))

arts.append(art(
    "java-kafka-vs-rabbitmq",
    "Kafka vs RabbitMQ: Choosing the Right Broker",
    3, "architecture",
    [
        "Kafka and RabbitMQ solve overlapping but different problems. RabbitMQ is a mature, broker-centric message queue built on the AMQP model, excellent for complex routing, per-message acknowledgment, and traditional task queues. It pushes messages to consumers and is ideal when you need flexible delivery rules and low per-message overhead.",
        "Kafka is a distributed commit log designed for high-throughput, durable, replayable event streaming. Producers append to partitioned, replicated topics; consumers pull and track their own offset. Because logs are retained, many independent consumer groups can replay the same events for different purposes, making Kafka a backbone for event-driven architectures and stream processing.",
        "The choice comes down to the shape of the workload. Use RabbitMQ when you need sophisticated routing, request/reply, or guaranteed per-message handling with modest throughput. Use Kafka when you need massive throughput, event replay, ordering per partition, and a system of record for events. Many architectures use both: RabbitMQ for task dispatch, Kafka for the event backbone.",
    ],
    [
        "Kafka 与 RabbitMQ 解决的问题有重叠却不相同。RabbitMQ 是一个成熟的、以中间件为中心、基于 AMQP 模型的消息队列，擅长复杂路由、逐条消息确认以及传统的任务队列。它把消息推送给消费者，在你需要灵活投递规则和较低单条消息开销时非常理想。",
        "Kafka 是一个为高通量、持久化、可重放的事件流而设计的分布式提交日志。生产者向分区且带副本的 topic 追加消息；消费者拉取并自行维护偏移量。由于日志会被保留，多个相互独立的消费组可以为不同目的重放同一批事件——这使 Kafka 成为事件驱动架构与流处理的中枢。",
        "选型归根结底取决于工作负载的形态。当你需要复杂路由、请求应答，或适度吞吐下的逐条可靠处理时，用 RabbitMQ。当你需要海量吞吐、事件重放、分区内有序，以及作为事件的“事实来源”时，用 Kafka。许多架构两者并用：RabbitMQ 负责任务分发，Kafka 负责事件中枢。",
    ],
    "Kafka 与 RabbitMQ：如何选型",
))

arts.append(art(
    "java-kafka-consumer-groups",
    "Kafka Consumer Groups and Rebalancing",
    4, "concurrency",
    [
        "In Kafka, a consumer group is a set of consumers that together read from a topic, with each partition assigned to exactly one member of the group. This is how Kafka achieves both parallelism and load balancing: adding consumers scales out processing, but you cannot have more active consumers than partitions, since extra ones stay idle.",
        "When a group starts, Kafka assigns partitions via a rebalance; if a consumer joins or leaves, or fails its heartbeat, the group rebalances and partitions are redistributed. Well-behaved consumers commit their offset after processing so progress is saved; if a consumer crashes, its partitions move to others and reading resumes from the last committed offset, possibly redelivering a few uncommitted messages.",
        "A key interview point is the at-least-once versus exactly-once trade-off controlled by when you commit. Committing after processing gives at-least-once, safe against loss but may duplicate; committing before processing risks loss. For strict correctness, use idempotent consumers or Kafka's transactional exactly-once semantics. Consumer groups are also how multiple independent applications can each get their own full view of a topic.",
    ],
    [
        "在 Kafka 中，消费组是一组共同读取某个 topic 的消费者，其中每个分区恰好分配给组内的一个成员。这正是 Kafka 实现并行与负载均衡的方式：增加消费者可横向扩展处理能力，但活跃消费者数不能超过分区数，多余者会处于空闲。",
        "当消费组启动时，Kafka 通过重平衡来分配分区；若有消费者加入、离开（或心跳失败），组会重新平衡并重新分配分区。行为良好的消费者会在处理后提交偏移量以保存进度；若某消费者崩溃，其分区会转移到其他成员，并从最后一次提交的偏移量处继续——可能会重投少量尚未提交的消息。",
        "一个关键面试点是“至少一次”与“恰好一次”的权衡，它由你提交偏移量的时机决定。处理后提交得到“至少一次”（不丢但可能重复）；处理前提交则有丢失风险。要严格正确，可使用幂等消费者或 Kafka 的事务恰好一次语义。消费组也是多个独立应用各自获得 topic 完整视图的方式。",
    ],
    "Kafka 消费组与重平衡",
))

arts.append(art(
    "java-mq-idempotent-consumption",
    "Idempotent Message Consumption",
    4, "pitfalls",
    [
        "Idempotent consumption means processing the same message more than once produces the same result as processing it once. This matters because most message brokers guarantee at-least-once delivery: network failures, consumer crashes, or rebalances cause messages to be redelivered, so your consumer must tolerate duplicates without creating duplicate side effects like double-charging a user.",
        "A common technique is a deduplication key. Each message carries a unique business ID, such as an order number or a producer-generated UUID. The consumer records processed IDs in a store, a database unique constraint, Redis SETNX, or a transactional outbox, and skips any message whose ID it has already handled. This turns duplicates into harmless no-ops.",
        "Another approach is to make the operation itself idempotent using database upserts or conditional updates, for example UPDATE ... WHERE version = ?. Combining a unique key with a version check prevents both duplicate inserts and lost updates. In interviews, emphasize that idempotency is a consumer-side responsibility and is essential for safe retries in any reliable messaging system.",
    ],
    [
        "幂等消费指的是同一条消息被处理多次，与只处理一次产生相同的结果。这一点至关重要，因为大多数消息中间件只保证“至少一次”投递：网络故障、消费者崩溃或重平衡都会导致消息被重投，因此你的消费者必须能容忍重复，而不会产生重复扣款之类的副作用。",
        "常用技术是去重键。每条消息携带一个唯一的业务 ID，如订单号或生产者生成的 UUID。消费者将已处理的 ID 记录到存储中——数据库唯一约束、Redis 的 SETNX 或事务性 Outbox——并跳过任何已处理过 ID 的消息。这使得重复消息变成无害的空操作。",
        "另一种做法是借助数据库 upsert 或条件更新（如 UPDATE ... WHERE version = ?）让操作本身具备幂等性。将唯一键与版本检查结合，既能防止重复插入，也能防止更新丢失。在面试中，要强调幂等性是消费者侧的责任，也是任何可靠消息系统中安全重试的基石。",
    ],
    "消息的幂等消费",
))

arts.append(art(
    "java-mq-dead-letter-queue",
    "Dead-Letter Queues in Message Systems",
    3, "practice",
    [
        "A dead-letter queue (DLQ) is a special destination where a message is sent after it cannot be processed successfully after several attempts. Messages may be dead-lettered because of repeated failures, a poison message that always throws, or because they expired (TTL) before being consumed. The DLQ isolates problematic messages so the main flow stays healthy.",
        "In RabbitMQ, you set up a dead-letter exchange and bind a queue to it with x-dead-letter-exchange; rejected or expired messages are routed there instead of being lost. In Kafka, there is no built-in DLQ, so teams typically create a separate topic-name-dlq topic and forward failing messages manually, often after a fixed number of retry attempts in the consumer.",
        "The value of a DLQ is that failures become observable and recoverable rather than silent. Operators can inspect, fix, and replay dead-lettered messages without blocking the live pipeline. A good interview answer covers not just how to route to a DLQ, but also a monitoring and replay strategy: how you alert, how you decide whether a message is truly dead, and how you reintroduce it safely.",
    ],
    [
        "死信队列（DLQ）是一个特殊的目的地：当一条消息经过多次尝试仍无法被成功处理时，就会被送往这里。消息成为死信的原因可能是反复失败、一条永远抛错的“毒消息”，或者它在被消费前就已过期（TTL）。DLQ 将有问题的消息隔离出来，使主流程保持健康。",
        "在 RabbitMQ 中，可以配置死信交换机，并用 x-dead-letter-exchange 将一个队列绑定到它；被拒绝或已过期的消息会被路由到该处而非丢失。Kafka 没有内置 DLQ，因此团队通常会自建一个独立的 topic-name-dlq topic，并在消费者重试固定次数后手动转发失败消息。",
        "DLQ 的价值在于：失败变得可观测、可恢复，而非悄无声息。运维人员可以检查、修复并重投死信消息，而不会阻塞实时管道。好的面试回答不仅要讲如何路由到 DLQ，还要给出监控与重投策略：如何告警、如何判断一条消息是否真的“死了”、以及如何安全地将其重新引入。",
    ],
    "消息系统中的死信队列",
))

# sanity: unique slugs
slugs = [a["slug"] for a in arts]
assert len(slugs) == len(set(slugs)), "duplicate slugs"

with open("/c/IdeaProjects/english/data/articles-java-extra6.json", "w", encoding="utf-8") as f:
    json.dump(arts, f, ensure_ascii=False, indent=2)

print("WROTE", len(arts), "articles")
