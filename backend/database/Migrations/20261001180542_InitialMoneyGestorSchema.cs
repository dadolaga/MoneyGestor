using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace database.Migrations
{
    /// <inheritdoc />
    public partial class InitialMoneyGestorSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "user",
                columns: table => new
                {
                    Id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Firstname = table.Column<string>(type: "longtext", nullable: false),
                    Lastname = table.Column<string>(type: "longtext", nullable: false),
                    Email = table.Column<string>(type: "varchar(255)", nullable: false),
                    Username = table.Column<string>(type: "varchar(255)", nullable: false),
                    Password = table.Column<string>(type: "longtext", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "color",
                columns: table => new
                {
                    Id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(255)", nullable: true),
                    Value = table.Column<uint>(type: "int unsigned", nullable: false),
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_color", x => x.Id);
                    table.ForeignKey(
                        name: "FK_color_user_UserId",
                        column: x => x.UserId,
                        principalTable: "user",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "login",
                columns: table => new
                {
                    Id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Token = table.Column<string>(type: "varchar(255)", nullable: false),
                    IsLong = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Expirated = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_login", x => x.Id);
                    table.ForeignKey(
                        name: "FK_login_user_UserId",
                        column: x => x.UserId,
                        principalTable: "user",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "transaction_type",
                columns: table => new
                {
                    Id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(255)", nullable: false),
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transaction_type", x => x.Id);
                    table.ForeignKey(
                        name: "FK_transaction_type_user_UserId",
                        column: x => x.UserId,
                        principalTable: "user",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "wallet",
                columns: table => new
                {
                    Id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(255)", nullable: false),
                    Value = table.Column<decimal>(type: "decimal(19,2)", precision: 19, scale: 2, nullable: false),
                    CurrentValue = table.Column<decimal>(type: "decimal(19,2)", precision: 19, scale: 2, nullable: false),
                    BalanceVersion = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    Favorite = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    ColorId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_wallet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_wallet_color_ColorId",
                        column: x => x.ColorId,
                        principalTable: "color",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_wallet_user_UserId",
                        column: x => x.UserId,
                        principalTable: "user",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "transaction",
                columns: table => new
                {
                    Id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Description = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    LongDescription = table.Column<string>(type: "varchar(4000)", maxLength: 4000, nullable: true),
                    Date = table.Column<DateTime>(type: "date", nullable: false),
                    TransactionTypeId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    UserInsertId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    WalletId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    Value = table.Column<decimal>(type: "decimal(19,2)", precision: 19, scale: 2, nullable: false),
                    TransactionDestinationId = table.Column<ulong>(type: "bigint unsigned", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transaction", x => x.Id);
                    table.CheckConstraint("CK_transaction_Value_NonZero", "`Value` <> 0");
                    table.ForeignKey(
                        name: "FK_transaction_transaction_TransactionDestinationId",
                        column: x => x.TransactionDestinationId,
                        principalTable: "transaction",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_transaction_transaction_type_TransactionTypeId",
                        column: x => x.TransactionTypeId,
                        principalTable: "transaction_type",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transaction_user_UserId",
                        column: x => x.UserId,
                        principalTable: "user",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transaction_user_UserInsertId",
                        column: x => x.UserInsertId,
                        principalTable: "user",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transaction_wallet_WalletId",
                        column: x => x.WalletId,
                        principalTable: "wallet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_color_Id",
                table: "color",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_color_Name_Value_UserId",
                table: "color",
                columns: new[] { "Name", "Value", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_color_UserId",
                table: "color",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_login_Id",
                table: "login",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_login_Token",
                table: "login",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_login_UserId",
                table: "login",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_Id",
                table: "transaction",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_TransactionDestinationId",
                table: "transaction",
                column: "TransactionDestinationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_transaction_TransactionTypeId",
                table: "transaction",
                column: "TransactionTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_UserId_Date",
                table: "transaction",
                columns: new[] { "UserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_transaction_UserInsertId",
                table: "transaction",
                column: "UserInsertId");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_WalletId",
                table: "transaction",
                column: "WalletId");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_type_UserId_Name",
                table: "transaction_type",
                columns: new[] { "UserId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_Email",
                table: "user",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_Username",
                table: "user",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_wallet_ColorId",
                table: "wallet",
                column: "ColorId");

            migrationBuilder.CreateIndex(
                name: "IX_wallet_Id",
                table: "wallet",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_wallet_Name_UserId",
                table: "wallet",
                columns: new[] { "Name", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_wallet_UserId",
                table: "wallet",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "login");

            migrationBuilder.DropTable(
                name: "transaction");

            migrationBuilder.DropTable(
                name: "transaction_type");

            migrationBuilder.DropTable(
                name: "wallet");

            migrationBuilder.DropTable(
                name: "color");

            migrationBuilder.DropTable(
                name: "user");
        }
    }
}
