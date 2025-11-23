// ====== KEEP ALIVE ======
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo!"));
app.listen(3000, () => console.log("Keep alive rodando!"));
// ========================

require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

// ===== VARIÁVEIS DO .ENV =====
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CANAL_REGISTROS = process.env.CANAL_REGISTROS; // NOVO CANAL
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const TOKEN = process.env.TOKEN;

// ===== BOT ONLINE =====
client.on("ready", async () => {
  console.log(`Bot ligado como ${client.user.tag}`);

  const canal = await client.channels.fetch(CANAL_PEDIR_SET);

  const embed = new EmbedBuilder()
    .setTitle("Sistema Familia A7")
    .setDescription(
      "Registro A7.\n\n Solicite Set , usando os botões abaixo.\n Registre-se Abaixo."
    )
    .addFields({
      name: "📌 Observações",
      value: `• A resenha aqui e garantida .\n• Nao leve a brincadeira a serio.`,
    })
    .setColor("#f1c40f");

  const btn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrirRegistro")
      .setLabel("Registro")
      .setStyle(ButtonStyle.Primary)
  );

  await canal.send({ embeds: [embed], components: [btn] });
});

// ===== ABRIR MODAL =====
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "abrirRegistro") return;

  const modal = new ModalBuilder()
    .setCustomId("modalRegistro")
    .setTitle("Solicitação de Set");

  const nome = new TextInputBuilder()
    .setCustomId("nome")
    .setLabel("Seu nome *")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const id = new TextInputBuilder()
    .setCustomId("iduser")
    .setLabel("Seu ID *")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nome),
    new ActionRowBuilder().addComponents(id)
  );

  await interaction.showModal(modal);
});

// ===== RECEBER FORMULÁRIO =====
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "modalRegistro") return;

  const nome = interaction.fields.getTextInputValue("nome");
  const iduser = interaction.fields.getTextInputValue("iduser");

  const canalAprovacao = await client.channels.fetch(CANAL_ACEITA_SET);
  const canalRegistros = await client.channels.fetch(CANAL_REGISTROS);

  // ----- Enviar para canal de aprovação -----
  const embed = new EmbedBuilder()
    .setTitle("Novo Pedido de Registro")
    .setColor("#3498db")
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "Usuário", value: `${interaction.user}` },
      { name: "Nome Informado", value: nome },
      { name: "ID Informado", value: iduser },
      {
        name: "Conta Criada em",
        value: `<t:${Math.floor(
          interaction.user.createdTimestamp / 1000
        )}:R>`,
      }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar_${interaction.user.id}_${nome}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`negar_${interaction.user.id}`)
      .setLabel("Negar")
      .setStyle(ButtonStyle.Danger)
  );

  await canalAprovacao.send({ embeds: [embed], components: [row] });

  // ----- SALVAR EM ABA SEPARADA (CANAL DE REGISTROS) -----
  const logEmbed = new EmbedBuilder()
    .setTitle("📁 Registro Recebido")
    .setColor("#2ecc71")
    .addFields(
      { name: "Usuário", value: `${interaction.user}` },
      { name: "Nome Informado", value: nome },
      { name: "ID Informado", value: iduser }
    );
  await canalRegistros.send({ embeds: [logEmbed] });

  // Resposta ao usuário
  await interaction.reply({
    content: "Seu pedido foi enviado!",
    ephemeral: true,
  });
});

// ===== APROVAR / NEGAR =====
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [acao, userId, nome] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  const membro = await interaction.guild.members.fetch(userId);

  if (acao === "aprovar") {
    await membro.roles.add(CARGO_APROVADO);

    // ---- ALTERA NICKNAME AUTOMATICAMENTE ----
    await membro.setNickname(`A7 | ${nome}`);

    await interaction.reply({
      content: `✔ Registro aprovado!\n• Nick alterado para **A7 | ${nome}**\n• Cargo aplicado.`,
    });
  } else {
    await interaction.reply({
      content: `❌ Pedido negado para ${membro}.`,
    });
  }
});

client.login(TOKEN);
