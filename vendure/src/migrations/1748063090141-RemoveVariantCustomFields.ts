import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveVariantCustomFields1748063090141 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsSize"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsColorpalette"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsArrangementstyle"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsAddon"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsMilktype"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsFlavorshot"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsCaffeinelevel"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsSize" character varying`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsColorpalette" character varying`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsArrangementstyle" character varying`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsAddon" character varying`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsMilktype" character varying`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsFlavorshot" character varying`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsCaffeinelevel" character varying`);
  }
}
