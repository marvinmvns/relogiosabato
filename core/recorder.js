// Registro de TUDO o que acontece numa sessão: pacotes do relógio (brutos e
// remontados), envios do app, ACKs, eventos de conexão, erros e relatórios de teste.
// Independe de plataforma: quem grava o arquivo é o adaptador `store`.
//
// Interface do store:
//   start(nomeDaSessao) -> Promise<string>       // devolve onde o arquivo fica
//   append(texto)       -> Promise<void>         // acrescenta ao arquivo da sessão
//   writeFile(nome, texto) -> Promise<string>    // grava um arquivo extra (relatório)
//   share?()            -> Promise<void>         // opcional: exportar o arquivo da sessão

export class Recorder {
  constructor(store, onEntry) {
    this.store = store;
    this.onEntry = onEntry;
    this.entries = [];
    this.chain = Promise.resolve();
    this.location = null;
    this.sessionName = null;
    this.failed = false;
  }

  async start(meta = {}) {
    this.sessionName = `sessao-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    this.entries = [];
    try {
      this.location = await this.store.start(this.sessionName);
    } catch (e) {
      this.location = null;
      this.failed = true;
      this.onEntry?.(this.#stamp({ type: 'erro', note: `sem arquivo de registro: ${e.message}` }));
    }
    await this.add({ type: 'sessao', note: 'início da sessão', ...meta });
    return this.location;
  }

  #stamp(entry) {
    return { t: new Date().toISOString(), seq: this.entries.length + 1, ...entry };
  }

  /** Registra uma entrada. A escrita é serializada para manter a ordem no arquivo. */
  add(entry) {
    const full = this.#stamp(entry);
    this.entries.push(full);
    this.onEntry?.(full);
    if (!this.location || this.failed) return Promise.resolve(full);
    const line = `${JSON.stringify(full)}\n`;
    this.chain = this.chain
      .then(() => this.store.append(line))
      .catch((e) => {
        if (!this.failed) {
          this.failed = true;
          this.onEntry?.(this.#stamp({ type: 'erro', note: `falha ao gravar o registro: ${e.message}` }));
        }
      });
    return this.chain.then(() => full);
  }

  async flush() {
    await this.chain;
  }

  async saveExtra(suffix, text) {
    await this.flush();
    return this.store.writeFile(`${this.sessionName}-${suffix}`, text);
  }

  async share() {
    await this.flush();
    if (!this.store.share) throw new Error('exportação não disponível nesta plataforma');
    return this.store.share();
  }
}
