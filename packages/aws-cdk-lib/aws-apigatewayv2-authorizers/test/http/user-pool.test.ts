import { HttpUserPoolAuthorizer } from './../../lib/http/user-pool';
import { DummyRouteIntegration } from './integration';
import { Template } from '../../../assertions';
import { HttpApi } from '../../../aws-apigatewayv2';
import { UserPool } from '../../../aws-cognito';
import { Stack } from '../../../core';

describe('HttpUserPoolAuthorizer', () => {
  test('default', () => {
    // GIVEN
    const stack = new Stack();
    const api = new HttpApi(stack, 'HttpApi');
    const userPool = new UserPool(stack, 'UserPool');
    const authorizer = new HttpUserPoolAuthorizer('BooksAuthorizer', userPool);

    // WHEN
    api.addRoutes({
      integration: new DummyRouteIntegration(),
      path: '/books',
      authorizer,
    });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGatewayV2::Authorizer', {
      AuthorizerType: 'JWT',
      IdentitySource: ['$request.header.Authorization'],
      JwtConfiguration: {
        Audience: [{ Ref: 'UserPoolUserPoolAuthorizerClient680A88B6' }],
        Issuer: {
          'Fn::Join': [
            '',
            [
              'https://cognito-idp.',
              { Ref: 'AWS::Region' },
              '.amazonaws.com/',
              stack.resolve(userPool.userPoolId),
            ],
          ],
        },
      },
      Name: 'BooksAuthorizer',
    });
  });

  test('same authorizer is used when bound to multiple routes', () => {
    // GIVEN
    const stack = new Stack();
    const api = new HttpApi(stack, 'HttpApi');
    const userPool = new UserPool(stack, 'UserPool');
    const authorizer = new HttpUserPoolAuthorizer('UserPoolAuthorizer', userPool);

    // WHEN
    api.addRoutes({
      integration: new DummyRouteIntegration(),
      path: '/books',
      authorizer,
    });
    api.addRoutes({
      integration: new DummyRouteIntegration(),
      path: '/pets',
      authorizer,
    });

    // THEN
    Template.fromStack(stack).resourceCountIs('AWS::ApiGatewayV2::Authorizer', 1);
  });

  test('multiple userPoolClients are attached', () => {
    // GIVEN
    const stack = new Stack();
    const api = new HttpApi(stack, 'HttpApi');
    const userPool = new UserPool(stack, 'UserPool');
    const userPoolClient1 = userPool.addClient('UserPoolClient1');
    const userPoolClient2 = userPool.addClient('UserPoolClient2');
    const authorizer = new HttpUserPoolAuthorizer('BooksAuthorizer', userPool, {
      userPoolClients: [userPoolClient1, userPoolClient2],
    });

    // WHEN
    api.addRoutes({
      integration: new DummyRouteIntegration(),
      path: '/books',
      authorizer,
    });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGatewayV2::Authorizer', {
      AuthorizerType: 'JWT',
      IdentitySource: ['$request.header.Authorization'],
      JwtConfiguration: {
        Audience: [stack.resolve(userPoolClient1.userPoolClientId), stack.resolve(userPoolClient2.userPoolClientId)],
        Issuer: {
          'Fn::Join': [
            '',
            [
              'https://cognito-idp.',
              { Ref: 'AWS::Region' },
              '.amazonaws.com/',
              stack.resolve(userPool.userPoolId),
            ],
          ],
        },
      },
    });
  });

  test('should expose authorizer id after authorizer has been bound to route', () => {
    // GIVEN
    const stack = new Stack();
    const api = new HttpApi(stack, 'HttpApi');
    const userPool = new UserPool(stack, 'UserPool');
    const userPoolClient1 = userPool.addClient('UserPoolClient1');
    const userPoolClient2 = userPool.addClient('UserPoolClient2');
    const authorizer = new HttpUserPoolAuthorizer('BooksAuthorizer', userPool, {
      userPoolClients: [userPoolClient1, userPoolClient2],
    });

    // WHEN
    api.addRoutes({
      integration: new DummyRouteIntegration(),
      path: '/books',
      authorizer,
    });

    // THEN
    expect(authorizer.authorizerId).toBeDefined();
  });

  test('should throw error when acessing authorizer before it been bound to route', () => {
    // GIVEN
    const stack = new Stack();
    const userPool = new UserPool(stack, 'UserPool');
    const userPoolClient1 = userPool.addClient('UserPoolClient1');
    const userPoolClient2 = userPool.addClient('UserPoolClient2');

    const t = () => {
      const authorizer = new HttpUserPoolAuthorizer('BooksAuthorizer', userPool, {
        userPoolClients: [userPoolClient1, userPoolClient2],
      });
      const authorizerId = authorizer.authorizerId;
    };

    // THEN
    expect(t).toThrow(Error);
  });
});
