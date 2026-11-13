// 将 Java 词库拆分为「Java 语言与生态」与「Spring 框架」两个栈。
// 规则：显式列出属于 Spring 生态（Spring 核心 / Boot / MVC / Data / AOP / 事务注解 / 调度 / 事件）
//       的词条，迁移到 data/seed/spring.json；其余保留在 data/seed/java.json。
// 同时把 Spring 主题文章从 articles-java.json 迁到 articles-spring.json。
// 运行：node scripts/split-java-spring.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SEED = path.join(ROOT, "data", "seed");
const DATA = path.join(ROOT, "data");

// —— 迁往 Spring 的词条（按 term 精确匹配，大小写不敏感）——
const SPRING_TERMS = [
  // IoC / DI / 容器
  "inversion of control",
  "dependency injection",
  "bean",
  "applicationcontext",
  "ioc container",
  "autowired",
  "component",
  "singleton scope",
  "configuration",
  "postconstruct",
  "stereotype annotation",
  // AOP
  "aspect",
  "aspect-oriented programming",
  "proxy",
  "pointcut",
  "advice",
  // Web / MVC
  "@RestController",
  "@Controller",
  "@Repository",
  "DispatcherServlet",
  "@RequestMapping",
  "ResponseEntity",
  "@ExceptionHandler",
  "interceptor",
  // 配置 / 运维
  "@ConfigurationProperties",
  "@Value",
  "@Qualifier",
  "@Primary",
  "Spring Boot",
  "auto-configuration",
  "actuator",
  "starter",
  // HTTP 客户端
  "WebClient",
  "RestTemplate",
  // 异步 / 调度 / 事件
  "@Async",
  "@Scheduled",
  "@EventListener",
  // 事务
  "@Transactional",
  "transaction manager",
  "propagation",
  // 注解式 bean
  "@Service",
  "@Bean",
  // Data JPA
  "@Query",
  "Spring Data JPA",
  // 测试
  "@SpringBootTest",
];

const SPRING_ARTICLES = new Set(["java-spring-ioc", "java-rest-controller"]);

const key = (s) => String(s || "").trim().toLowerCase();
const springSet = new Set(SPRING_TERMS.map(key));

// —— 1. 拆分词库 ——
const javaFile = path.join(SEED, "java.json");
const javaWords = JSON.parse(fs.readFileSync(javaFile, "utf-8"));

const springWords = [];
const keptJava = [];
let missing = 0;

for (const w of javaWords) {
  if (springSet.has(key(w.term))) springWords.push(w);
  else keptJava.push(w);
}

// 校验：显式列表里是否有 java.json 中不存在的词（防止拼写错误导致静默漏迁）
const javaTerms = new Set(javaWords.map((w) => key(w.term)));
for (const t of SPRING_TERMS) {
  if (!javaTerms.has(key(t))) {
    missing++;
    console.log(`  ! 未在 java.json 中找到：${t}`);
  }
}

fs.writeFileSync(javaFile, JSON.stringify(keptJava, null, 2) + "\n");
fs.writeFileSync(path.join(SEED, "spring.json"), JSON.stringify(springWords, null, 2) + "\n");
console.log(`• java.json  : ${javaWords.length} → ${keptJava.length} 词（迁出 ${javaWords.length - keptJava.length}）`);
console.log(`• spring.json: 新建 ${springWords.length} 词`);
if (missing) console.log(`  ⚠ ${missing} 个目标词未匹配到`);

// —— 2. 拆分文章 ——
const javaArtFile = path.join(DATA, "articles-java.json");
if (fs.existsSync(javaArtFile)) {
  const arts = JSON.parse(fs.readFileSync(javaArtFile, "utf-8"));
  const springArts = arts.filter((a) => SPRING_ARTICLES.has(a.slug));
  const keptArts = arts.filter((a) => !SPRING_ARTICLES.has(a.slug));
  for (const a of springArts) a.stackSlug = "spring";
  fs.writeFileSync(javaArtFile, JSON.stringify(keptArts, null, 2) + "\n");
  fs.writeFileSync(path.join(DATA, "articles-spring.json"), JSON.stringify(springArts, null, 2) + "\n");
  console.log(`• articles-java.json  : ${arts.length} → ${keptArts.length} 篇`);
  console.log(`• articles-spring.json: 新建 ${springArts.length} 篇`);
}

// —— 3. 更新 stacks.json ——
const stacksFile = path.join(DATA, "stacks.json");
const stacks = JSON.parse(fs.readFileSync(stacksFile, "utf-8"));
const java = stacks.find((s) => s.slug === "java");
java.name = "Java 语言与生态";
java.description = "JVM、集合、并发、泛型、IO/NIO、Stream 与 Lambda";
if (!stacks.find((s) => s.slug === "spring")) {
  stacks.push({
    slug: "spring",
    name: "Spring 框架",
    description: "IoC/DI、Boot、MVC、事务、AOP 与 Spring Data",
    icon: "🍃",
    order: 15,
  });
}
fs.writeFileSync(stacksFile, JSON.stringify(stacks, null, 2) + "\n");
console.log(`• stacks.json: ${stacks.length} 个技术栈（新增 spring）`);
