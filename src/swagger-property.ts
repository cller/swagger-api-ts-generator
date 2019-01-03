export interface SwaggerProperty {
  items: {
    /**
     * 集合引用类型
     */
    $ref: string;

    /**
     * 类型
     */
    type: string;
  };
  /**
   * 属性描述
   */
  description: string;

  /**
   * 是否允许为空
   */
  allowEmptyValue: boolean;

  /**
   *  属性类型
   */
  type: string;

  /**
   * 引用类型 '#/definitions/ActDetail'
   */
  $ref: string;
  /**
   * 枚举类型
   */
  enum: string[]
}
