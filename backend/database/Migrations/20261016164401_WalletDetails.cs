using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace database.Migrations
{
    /// <inheritdoc />
    public partial class WalletDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CreditLimit",
                table: "wallet",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "wallet",
                type: "varchar(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "EUR");

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentSpending",
                table: "wallet",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Expiry",
                table: "wallet",
                type: "varchar(7)",
                maxLength: 7,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Iban",
                table: "wallet",
                type: "varchar(34)",
                maxLength: 34,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Institution",
                table: "wallet",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "wallet",
                type: "varchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "bank");

            migrationBuilder.AddColumn<string>(
                name: "LastFour",
                table: "wallet",
                type: "varchar(4)",
                maxLength: 4,
                nullable: true);

            migrationBuilder.AddColumn<ulong>(
                name: "LinkedAccountId",
                table: "wallet",
                type: "bigint unsigned",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Network",
                table: "wallet",
                type: "varchar(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "wallet",
                type: "varchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentDay",
                table: "wallet",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Shareable",
                table: "wallet",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "StatementDay",
                table: "wallet",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_wallet_LinkedAccountId",
                table: "wallet",
                column: "LinkedAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_wallet_wallet_LinkedAccountId",
                table: "wallet",
                column: "LinkedAccountId",
                principalTable: "wallet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_wallet_wallet_LinkedAccountId",
                table: "wallet");

            migrationBuilder.DropIndex(
                name: "IX_wallet_LinkedAccountId",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "CreditLimit",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "CurrentSpending",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "Expiry",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "Iban",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "Institution",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "LastFour",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "LinkedAccountId",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "Network",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "PaymentDay",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "Shareable",
                table: "wallet");

            migrationBuilder.DropColumn(
                name: "StatementDay",
                table: "wallet");
        }
    }
}
