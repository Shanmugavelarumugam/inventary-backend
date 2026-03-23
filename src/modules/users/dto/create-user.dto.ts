export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

export class UpdateUserDto {
  name?: string;
  isActive?: boolean;
  roleId?: string;
}
