using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace database.Migrations
{
    /// <inheritdoc />
    public partial class InitialUnifiedSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    Firstname = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    Lastname = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    UserName = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                    NormalizedUserName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    Email = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    NormalizedEmail = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    EmailConfirmed = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    PasswordHash = table.Column<string>(type: "longtext", nullable: true),
                    SecurityStamp = table.Column<string>(type: "longtext", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "longtext", nullable: true),
                    PhoneNumber = table.Column<string>(type: "longtext", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetime", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    RoleId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    ClaimType = table.Column<string>(type: "longtext", nullable: true),
                    ClaimValue = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    ClaimType = table.Column<string>(type: "longtext", nullable: true),
                    ClaimValue = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "varchar(255)", nullable: false),
                    ProviderKey = table.Column<string>(type: "varchar(255)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "longtext", nullable: true),
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    RoleId = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    LoginProvider = table.Column<string>(type: "varchar(255)", nullable: false),
                    Name = table.Column<string>(type: "varchar(255)", nullable: false),
                    Value = table.Column<string>(type: "longtext", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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
                        name: "FK_color_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
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
                        name: "FK_transaction_type_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
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
                    Kind = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false, defaultValue: "bank"),
                    Currency = table.Column<string>(type: "varchar(3)", maxLength: 3, nullable: false, defaultValue: "EUR"),
                    Institution = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true),
                    Iban = table.Column<string>(type: "varchar(34)", maxLength: 34, nullable: true),
                    LastFour = table.Column<string>(type: "varchar(4)", maxLength: 4, nullable: true),
                    Network = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: true),
                    Expiry = table.Column<string>(type: "varchar(7)", maxLength: 7, nullable: true),
                    LinkedAccountId = table.Column<ulong>(type: "bigint unsigned", nullable: true),
                    CreditLimit = table.Column<decimal>(type: "decimal(19,2)", precision: 19, scale: 2, nullable: true),
                    CurrentSpending = table.Column<decimal>(type: "decimal(19,2)", precision: 19, scale: 2, nullable: true),
                    StatementDay = table.Column<int>(type: "int", nullable: true),
                    PaymentDay = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true),
                    Shareable = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    ColorId = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    UserId = table.Column<ulong>(type: "bigint unsigned", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_wallet", x => x.Id);
                    table.ForeignKey(
                        name: "FK_wallet_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_wallet_color_ColorId",
                        column: x => x.ColorId,
                        principalTable: "color",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_wallet_wallet_LinkedAccountId",
                        column: x => x.LinkedAccountId,
                        principalTable: "wallet",
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
                        name: "FK_transaction_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transaction_AspNetUsers_UserInsertId",
                        column: x => x.UserInsertId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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
                        name: "FK_transaction_wallet_WalletId",
                        column: x => x.WalletId,
                        principalTable: "wallet",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

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
                name: "IX_wallet_ColorId",
                table: "wallet",
                column: "ColorId");

            migrationBuilder.CreateIndex(
                name: "IX_wallet_Id",
                table: "wallet",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_wallet_LinkedAccountId",
                table: "wallet",
                column: "LinkedAccountId");

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
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "transaction");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "transaction_type");

            migrationBuilder.DropTable(
                name: "wallet");

            migrationBuilder.DropTable(
                name: "color");

            migrationBuilder.DropTable(
                name: "AspNetUsers");
        }
    }
}
