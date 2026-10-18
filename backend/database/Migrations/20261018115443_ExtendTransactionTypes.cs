using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace database.Migrations
{
    /// <inheritdoc />
    public partial class ExtendTransactionTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "transaction_type",
                type: "varchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "grey");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "transaction_type",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "transaction_type",
                type: "varchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "tag");

            migrationBuilder.AddColumn<string>(
                name: "Keywords",
                table: "transaction_type",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<ulong>(
                name: "ParentId",
                table: "transaction_type",
                type: "bigint unsigned",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "UseInReports",
                table: "transaction_type",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateIndex(
                name: "IX_transaction_type_ParentId",
                table: "transaction_type",
                column: "ParentId");

            migrationBuilder.AddForeignKey(
                name: "FK_transaction_type_transaction_type_ParentId",
                table: "transaction_type",
                column: "ParentId",
                principalTable: "transaction_type",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_transaction_type_transaction_type_ParentId",
                table: "transaction_type");

            migrationBuilder.DropIndex(
                name: "IX_transaction_type_ParentId",
                table: "transaction_type");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "transaction_type");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "transaction_type");

            migrationBuilder.DropColumn(
                name: "Icon",
                table: "transaction_type");

            migrationBuilder.DropColumn(
                name: "Keywords",
                table: "transaction_type");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "transaction_type");

            migrationBuilder.DropColumn(
                name: "UseInReports",
                table: "transaction_type");
        }
    }
}
